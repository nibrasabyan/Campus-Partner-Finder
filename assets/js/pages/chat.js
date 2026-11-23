// 6.2 Percakapan + 6.3 Kesepakatan / Deal + 6.4 Status Diambil
// Header memperlihatkan catatan asal sebagai kartu kecil. Saat Deal, cap "Diambil"
// menempel di kartu itu (momen utama setelah papan).
App.init(function () {
  var id = App.param('id');
  var card = document.getElementById('chat-card');
  var box = document.getElementById('chat-box');
  var form = document.getElementById('message-form');
  var input = document.getElementById('message-input');
  var sendBtn = document.getElementById('send-btn');
  var dealBtn = document.getElementById('deal-btn');
  var confirmBtn = document.getElementById('confirm-deal-btn');
  var modalEl = document.getElementById('deal-modal');
  var messageError = document.getElementById('message-error');
  var lastCount = -1;
  var conv = null;
  var sourceCampaign = null;
  var timer = null;

  sendBtn.innerHTML = App.icon('send') + '<span class="d-none d-sm-inline">Kirim</span><span class="visually-hidden d-sm-none">Kirim pesan</span>';

  function notFound(message) {
    card.classList.add('d-none');
    document.getElementById('chat-alert').innerHTML = App.emptyState('Obrolan tidak ditemukan.', message,
      '<a class="btn btn-primary" href="chats.html">Buka daftar obrolan</a>');
  }

  if (!id) {
    notFound('Tautannya tidak lengkap. Pilih obrolan dari daftar.');
    return;
  }

  // Kartu kecil catatan asal: kampanye (catatan miring) atau profil (kartu identitas).
  function renderSource(c) {
    var taken = c.deal || c.closed;
    var holder = document.getElementById('source-note');
    if (c.type === 'campaign') {
      var owner = sourceCampaign ? sourceCampaign.ownerLabel : c.partnerLabel;
      var st = App.noteStyle(owner, c.refTitle.length);
      holder.innerHTML =
        '<a class="note note--mini' + (st.tone !== 'white' ? ' note--' + st.tone : '') + (taken ? ' is-taken' : '') + '"' +
        ' id="source-card" style="--tilt:' + st.tilt + 'deg" href="campaign.html?id=' + encodeURIComponent(c.refId) + '">' +
        (taken ? App.stampHTML(true) : '') +
        '<p class="note-text">Dari kampanye: ' + App.escape(c.refTitle) + '</p></a>';
    } else {
      var label = c.refTitle.replace(/^Profil /, '');
      holder.innerHTML =
        '<a class="idcard idcard--mini' + (taken ? ' is-taken' : '') + '" id="source-card" href="partner.html?id=' + encodeURIComponent(c.refId) + '">' +
        (taken ? App.stampHTML(true) : '') +
        App.avatar(label, 32) + '<span>Dari profil ' + App.escape(label) + '</span></a>';
    }
  }

  function renderHeader(c) {
    document.getElementById('partner-label').textContent = c.partnerLabel;
    document.getElementById('partner-avatar').innerHTML = App.avatar(c.partnerLabel, 48);
    document.getElementById('modal-partner').textContent = c.partnerLabel;
    document.getElementById('modal-ref-type').textContent = c.type === 'campaign' ? 'Kampanye' : 'Profil';
  }

  // 6.4 Status Diambil: kunci obrolan setelah Deal.
  function renderState(c) {
    var status = document.getElementById('deal-status');
    if (c.deal) {
      status.innerHTML = '<div class="deal-note" role="status">' + App.icon('check') +
        '<div><strong>Diambil.</strong> Deal dibuat ' + App.escape(App.formatDate(c.dealAt)) + '. Obrolan ini ditutup.</div></div>';
    } else if (c.closed) {
      status.innerHTML = '<div class="deal-note" role="status">' + App.icon('info') +
        '<div>Obrolan ditutup karena ' + (c.type === 'campaign' ? 'kampanye' : 'profil') +
        ' ini sudah diambil partner lain.</div></div>';
    } else {
      status.innerHTML = '';
    }
    var locked = c.deal || c.closed;
    input.disabled = locked;
    sendBtn.disabled = locked;
    dealBtn.disabled = locked;
    if (locked) {
      input.placeholder = 'Obrolan ditutup';
      dealBtn.classList.remove('btn-stamp');
      dealBtn.classList.add('btn-taken');
      dealBtn.innerHTML = App.icon('check') + (c.deal ? 'Sudah Diambil' : 'Ditutup');
    }
  }

  function renderMessages(c, first) {
    if (c.messages.length === lastCount) return;
    var previous = lastCount;
    lastCount = c.messages.length;
    if (!c.messages.length) {
      box.innerHTML = '<p class="muted text-center my-4 mx-auto measure">Belum ada pesan. Sapa ' +
        App.escape(c.partnerLabel) + ' dan bahas kebutuhan kalian.</p>';
      return;
    }
    box.innerHTML = c.messages.map(function (m, i) {
      // Pesan baru (bukan saat halaman pertama dibuka) masuk dari sisi pengirimnya.
      var isNew = !first && i >= previous && previous >= 0;
      return '<div class="msg ' + (m.mine ? 'msg-mine' : 'msg-theirs') + ' r' + (App.hash(m.id) % 3) + (isNew ? ' is-new' : '') + '">' +
        '<span class="visually-hidden">' + (m.mine ? 'Anda' : App.escape(c.partnerLabel)) + ': </span>' +
        App.escape(m.text) + '<time datetime="' + App.escape(m.createdAt) + '">' +
        App.escape(App.formatDate(m.createdAt)) + '</time></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function load(first) {
    return Api.getConversation(id).then(function (c) {
      var wasLocked = conv && (conv.deal || conv.closed);
      conv = c;
      if (first) {
        renderHeader(c);
        card.classList.remove('d-none');
      }
      if (first || (c.deal || c.closed) !== wasLocked) renderSource(c);
      renderMessages(c, first);
      renderState(c);
      // Hentikan pembaruan berkala setelah obrolan ditutup.
      if ((c.deal || c.closed) && timer) {
        clearInterval(timer);
        timer = null;
      }
      return c;
    }).catch(function (err) {
      if (first) notFound(err.message);
    });
  }

  Api.getConversation(id)
    .then(function (c) {
      // Ambil data kampanye agar kartu kecil memakai warna & kemiringan yang sama dengan papan.
      if (c.type !== 'campaign') return null;
      return Api.getCampaign(c.refId).then(function (camp) { sourceCampaign = camp; }).catch(function () { return null; });
    })
    .catch(function () { return null; })
    .then(function () { return load(true); })
    .then(function () {
      // Simulasi waktu nyata: periksa pesan baru tiap 4 detik.
      if (conv && !conv.deal && !conv.closed) {
        timer = setInterval(function () { load(false); }, 4000);
      }
    });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    messageError.textContent = '';
    input.classList.remove('is-invalid');
    var text = input.value.trim();
    if (!text) {
      input.classList.add('is-invalid');
      messageError.textContent = 'Tulis pesan dulu, lalu kirim.';
      input.focus();
      return;
    }
    App.busy(sendBtn, true, '');
    Api.sendMessage(id, text).then(function () {
      input.value = '';
      App.busy(sendBtn, false);
      return load(false);
    }).then(function () {
      input.focus();
    }).catch(function (err) {
      App.busy(sendBtn, false);
      App.showError('chat-alert', err.message);
      load(false);
    });
  });

  confirmBtn.addEventListener('click', function () {
    App.busy(confirmBtn, true, 'Menyimpan...');
    Api.markDeal(id).then(function () {
      App.busy(confirmBtn, false);
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      return load(false);
    }).then(function () {
      // Cap "Diambil" menempel di kartu asal: scale 1.4 → 1, lalu getaran kecil.
      var source = document.getElementById('source-card');
      App.stampIn(source && source.querySelector('.stamp'), source);
      App.toast((conv && conv.type === 'profile' ? 'Deal tercatat. Profil' : 'Deal tercatat. Kampanye') + ' diberi cap Diambil.');
    }).catch(function (err) {
      App.busy(confirmBtn, false);
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      App.showError('chat-alert', err.message);
      load(false);
    });
  });

  // Kembalikan fokus ke tempat yang masuk akal saat modal ditutup (aksesibilitas keyboard).
  modalEl.addEventListener('hidden.bs.modal', function () {
    if (!dealBtn.disabled) dealBtn.focus();
    else box.focus();
  });

  window.addEventListener('beforeunload', function () {
    if (timer) clearInterval(timer);
  });
});

// 2.1 Daftar / Masuk (khusus mahasiswa; admin memakai admin-login.html)
App.init(function () {
  // Buka tab sesuai parameter ?tab=daftar|masuk (bawaan: masuk)
  var tab = App.param('tab') === 'daftar' ? 'tab-daftar' : 'tab-masuk';
  bootstrap.Tab.getOrCreateInstance(document.getElementById(tab)).show();

  // Validasi email + password; mengembalikan true jika valid.
  function validate(form, emailInput, passwordInput, checkLength) {
    App.clearFieldErrors(form);
    var valid = true;
    var email = emailInput.value.trim();
    if (!email) {
      App.fieldError(emailInput, 'Isi email kampus Anda.');
      valid = false;
    } else if (!App.isEmail(email)) {
      App.fieldError(emailInput, 'Email belum lengkap. Contoh: nama@student.ub.ac.id');
      valid = false;
    }
    if (!passwordInput.value) {
      App.fieldError(passwordInput, 'Isi password.');
      valid = false;
    } else if (checkLength && passwordInput.value.length < 6) {
      App.fieldError(passwordInput, 'Password minimal 6 karakter. Tambahkan huruf atau angka.');
      valid = false;
    }
    if (!valid) App.focusFirstInvalid(form);
    return valid;
  }

  // ----- Masuk -----
  var loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    App.clearError('login-alert');
    var email = document.getElementById('login-email');
    var password = document.getElementById('login-password');
    if (!validate(loginForm, email, password, false)) return;

    var btn = loginForm.querySelector('button[type="submit"]');
    App.busy(btn, true, 'Masuk...');
    // Halaman ini khusus mahasiswa; akun admin diarahkan ke admin-login.html (sitemap 7.1–7.2).
    Api.login({ email: email.value.trim(), password: password.value, role: 'mahasiswa' })
      .then(function (user) {
        App.flash('Anda masuk sebagai ' + user.label + '.');
        window.location.href = App.homeFor(user);
      })
      .catch(function (err) {
        App.busy(btn, false);
        App.showError('login-alert', err.message);
        if (err.code === 'ADMIN_ACCOUNT') {
          // Tambahkan tautan langsung ke halaman Login admin di dalam pesan.
          var box = document.querySelector('#login-alert .alert > div');
          if (box) {
            box.insertAdjacentHTML('beforeend',
              ' <a href="admin-login.html" class="alert-link" id="admin-login-hint">Buka Login admin</a>');
          }
        }
      });
  });

  // ----- Daftar -----
  var regForm = document.getElementById('register-form');
  regForm.addEventListener('submit', function (e) {
    e.preventDefault();
    App.clearError('register-alert');
    var email = document.getElementById('reg-email');
    var password = document.getElementById('reg-password');
    if (!validate(regForm, email, password, true)) return;

    var btn = regForm.querySelector('button[type="submit"]');
    App.busy(btn, true, 'Mendaftar...');
    Api.register({ email: email.value.trim(), password: password.value })
      .then(function () {
        App.flash('Akun terdaftar. Lengkapi profil anonim Anda.');
        window.location.href = 'profile.html';
      })
      .catch(function (err) {
        App.busy(btn, false);
        App.showError('register-alert', err.message);
      });
  });
});

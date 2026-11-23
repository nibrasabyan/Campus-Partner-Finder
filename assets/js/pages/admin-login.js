// 7.1–7.2 Login / Signup Admin
App.init(function () {
  function validate(form, emailInput, passwordInput, checkLength) {
    App.clearFieldErrors(form);
    var valid = true;
    var email = emailInput.value.trim();
    if (!email) {
      App.fieldError(emailInput, 'Isi email admin.');
      valid = false;
    } else if (!App.isEmail(email)) {
      App.fieldError(emailInput, 'Email belum lengkap. Contoh: admin@ub.ac.id');
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

  function bind(formId, alertId, emailId, passwordId, checkLength, action, busyText) {
    var form = document.getElementById(formId);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      App.clearError(alertId);
      var email = document.getElementById(emailId);
      var password = document.getElementById(passwordId);
      if (!validate(form, email, password, checkLength)) return;
      var btn = form.querySelector('button[type="submit"]');
      App.busy(btn, true, busyText);
      action({ email: email.value.trim(), password: password.value, role: 'admin' })
        .then(function () {
          App.flash('Anda masuk sebagai admin.');
          window.location.href = 'admin-queue.html';
        })
        .catch(function (err) {
          App.busy(btn, false);
          App.showError(alertId, err.message);
        });
    });
  }

  bind('login-form', 'login-alert', 'login-email', 'login-password', false, Api.login, 'Masuk...');
  bind('signup-form', 'signup-alert', 'signup-email', 'signup-password', true, Api.registerAdmin, 'Membuat akun...');
});

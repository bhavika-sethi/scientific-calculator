/* =====================================================
   Scientific Calculator – App Logic
   ===================================================== */

'use strict';

/* ── State ── */
let expression  = '';
let lastResult  = null;
let angleMode   = 'deg';   // 'deg' | 'rad'
let justEvaled  = false;
let isAuthenticated = false;

/* ── DOM refs ── */
const display      = document.getElementById('display');
const historyEl    = document.getElementById('history');
const angleBadge   = document.getElementById('angleBadge');
const logoutBtn    = document.getElementById('logoutBtn');
const userInfo     = document.getElementById('userInfo');
const appWrapper   = document.getElementById('appWrapper');

/* ── Modal elements ── */
const loginModal   = document.getElementById('loginModal');
const closeModal   = document.getElementById('closeModal');
const tabLogin     = document.getElementById('tabLogin');
const tabSignup    = document.getElementById('tabSignup');
const panelLogin   = document.getElementById('panelLogin');
const panelSignup  = document.getElementById('panelSignup');
const loginSubmit  = document.getElementById('loginSubmit');
const signupSubmit = document.getElementById('signupSubmit');
const loginMsg     = document.getElementById('loginMsg');
const signupMsg    = document.getElementById('signupMsg');

/* ════════════════════════════════════════════════════
   AUTH GATE
════════════════════════════════════════════════════ */

/** Show login modal and hide calculator */
function showLoginPage() {
  appWrapper.classList.add('hidden');
  loginModal.classList.add('open');
  closeModal.classList.add('hidden');   // can't dismiss without login
  isAuthenticated = false;
}

/** Hide login modal and reveal calculator */
function showCalculator(username) {
  loginModal.classList.remove('open');
  appWrapper.classList.remove('hidden');
  closeModal.classList.remove('hidden');
  userInfo.textContent = username || '';
  isAuthenticated = true;
}

/* Auto-show login on page load */
showLoginPage();

/* ── Tab switching ── */
[tabLogin, tabSignup].forEach(tab => {
  tab.addEventListener('click', () => {
    tabLogin.classList.toggle('active',  tab === tabLogin);
    tabSignup.classList.toggle('active', tab === tabSignup);
    panelLogin.classList.toggle('hidden',  tab !== tabLogin);
    panelSignup.classList.toggle('hidden', tab !== tabSignup);
    loginMsg.textContent  = '';
    signupMsg.textContent = '';
  });
});

/* Dismiss modal only when already authenticated */
closeModal.addEventListener('click', () => {
  if (isAuthenticated) loginModal.classList.remove('open');
});

/* ════════════════════════════════════════════════════
   LOGIN SUBMIT
════════════════════════════════════════════════════ */
loginSubmit.addEventListener('click', () => {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  loginMsg.textContent = '';
  loginMsg.style.color = '';

  if (!email || !password) {
    loginMsg.textContent = '⚠ Please fill in all fields.';
    return;
  }

  /* Firebase auth (if configured) */
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
    loginSubmit.textContent = 'Signing in…';
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(cred => {
        loginSubmit.textContent = 'Sign In';
        showCalculator(cred.user.email.split('@')[0]);
      })
      .catch(err => {
        loginMsg.textContent = '✗ ' + err.message;
        loginSubmit.textContent = 'Sign In';
      });
  } else {
    /* Demo mode – accept any non-empty credentials */
    loginMsg.style.color = 'var(--equals)';
    loginMsg.textContent = '✓ Demo login successful!';
    setTimeout(() => {
      loginMsg.style.color = '';
      showCalculator(email.split('@')[0]);
    }, 900);
  }
});

/* ════════════════════════════════════════════════════
   SIGN UP SUBMIT
════════════════════════════════════════════════════ */
signupSubmit.addEventListener('click', () => {
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  signupMsg.textContent = '';
  signupMsg.style.color = '';

  if (!email || !password) {
    signupMsg.textContent = '⚠ Please fill in all fields.';
    return;
  }
  if (password.length < 6) {
    signupMsg.textContent = '⚠ Password must be at least 6 characters.';
    return;
  }

  /* Firebase auth (if configured) */
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
    signupSubmit.textContent = 'Creating…';
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(cred => {
        signupSubmit.textContent = 'Create Account';
        showCalculator(cred.user.email.split('@')[0]);
      })
      .catch(err => {
        signupMsg.textContent = '✗ ' + err.message;
        signupSubmit.textContent = 'Create Account';
      });
  } else {
    /* Demo mode */
    signupMsg.style.color = 'var(--equals)';
    signupMsg.textContent = '✓ Account created (Demo mode)!';
    setTimeout(() => {
      signupMsg.style.color = '';
      showCalculator(email.split('@')[0]);
    }, 900);
  }
});

/* ── Logout → back to login ── */
logoutBtn.addEventListener('click', () => {
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
    firebase.auth().signOut();
  }
  /* Reset calculator state */
  expression = ''; lastResult = null; justEvaled = false;
  if (display)    { display.value = ''; }
  if (historyEl)  { historyEl.textContent = ''; }
  showLoginPage();
});

/* Firebase auth state observer */
if (typeof firebase !== 'undefined') {
  try {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        showCalculator(user.email ? user.email.split('@')[0] : 'User');
      } else {
        showLoginPage();
      }
    });
  } catch (_) { /* Firebase not configured – demo mode handles it */ }
}

/* ════════════════════════════════════════════════════
   CALCULATOR LOGIC
════════════════════════════════════════════════════ */

/* ── Utility: to radians ── */
const toRad = v => angleMode === 'deg' ? (v * Math.PI / 180) : v;

/* ── setError: show a human-readable error, no crash ── */
function setError(msg) {
  historyEl.textContent = '';
  display.value = msg;
  expression = '';
  justEvaled = false;
}

/* ── Evaluate raw JS expression safely ── */
function evaluate(expr) {
  try {
    let e = expr
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/−/g, '-');

    // Detect divide-by-zero before eval
    if (/\/\s*0(?![.\d])/.test(e)) return { error: 'Cannot ÷ by zero' };

    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + e + ')')();

    if (result === Infinity || result === -Infinity) return { error: 'Result is ∞' };
    if (typeof result !== 'number' || isNaN(result)) return { error: 'Invalid expression' };

    const formatted = parseFloat(result.toPrecision(12));
    return { value: formatted.toString() };
  } catch {
    return { error: 'Invalid expression' };
  }
}

/* ── Display auto-shrink for long numbers ── */
const MAX_DISPLAY_CHARS = 18;
function updateDisplay(text) {
  if (!display) return;
  display.value = text;
  // Scale font size down if overflowing
  const len = String(text).length;
  if (len > MAX_DISPLAY_CHARS) {
    display.style.fontSize = Math.max(0.9, 2.4 - (len - MAX_DISPLAY_CHARS) * 0.08) + 'rem';
  } else {
    display.style.fontSize = '';
  }
}

/* ── Button click handler ── */
function handleButton(value) {
  // Clear error state on any new input
  if (display && display.value && !expression &&
      display.value !== '0' && isNaN(Number(display.value))) {
    display.value = '';
  }

  // After evaluation, pressing a digit starts fresh; operators continue
  if (justEvaled) {
    if (/^[0-9]$/.test(value) || value === 'dot') {
      expression = '';
    } else if (value === 'clear') {
      expression = ''; lastResult = null; justEvaled = false;
      updateDisplay(''); historyEl.textContent = ''; return;
    }
    justEvaled = false;
  }

  switch (value) {

    /* ── Digits ── */
    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9':
      expression += value;
      break;

    /* ── Decimal ── */
    case 'dot': {
      const parts = expression.split(/[\+\-\*\/\%]/);
      const last  = parts[parts.length - 1];
      if (!last.includes('.')) expression += '.';
      break;
    }

    /* ── Basic Operators ── */
    case '+': case '-': case '*': case '/': case '%':
      if (expression === '' && value === '-') { expression = '-'; break; }
      if (expression !== '') {
        // Collapse two operators in a row → replace the last one
        expression = expression.replace(/[\+\-\*\/]{1,2}$/, '');
        expression += value;
      }
      break;

    /* ── Constants ── */
    case 'pi': expression += Math.PI; break;
    case 'e':  expression += Math.E;  break;

    /* ── Equals ── */
    case '=': {
      if (!expression) break;
      const raw = expression;
      const res = evaluate(expression);
      if (res.error) {
        historyEl.textContent = raw + ' =';
        setError(res.error);
        return;
      }
      historyEl.textContent = raw + ' =';
      expression = res.value;
      updateDisplay(res.value);
      lastResult = res.value;
      justEvaled = true;
      return;
    }

    /* ── Clear ── */
    case 'clear':
      expression = ''; lastResult = null; justEvaled = false;
      historyEl.textContent = '';
      updateDisplay('');
      return;

    /* ── Backspace ── */
    case 'back':
      expression = expression.slice(0, -1);
      break;

    /* ── Negate ── */
    case 'neg':
      if (!expression) break;
      if (expression.startsWith('-')) expression = expression.slice(1);
      else expression = '-' + expression;
      break;

    /* ── Square ── */
    case 'pow2': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `(${expression})² =`;
      expression = String(v * v);
      break;
    }

    /* ── Power (xʸ) – append ** operator ── */
    case 'pow':
      if (expression !== '') expression += '**';
      break;

    /* ── Square root ── */
    case 'sqrt': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `√(${expression}) =`;
      if (v < 0) { setError('√ of negative'); return; }
      expression = String(parseFloat(Math.sqrt(v).toPrecision(12)));
      break;
    }

    /* ── Trig ── */
    case 'sin': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `sin(${expression}) =`;
      expression = String(parseFloat(Math.sin(toRad(v)).toPrecision(12)));
      break;
    }
    case 'cos': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `cos(${expression}) =`;
      expression = String(parseFloat(Math.cos(toRad(v)).toPrecision(12)));
      break;
    }
    case 'tan': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `tan(${expression}) =`;
      const tanResult = Math.tan(toRad(v));
      if (!isFinite(tanResult)) { setError('tan undefined here'); return; }
      expression = String(parseFloat(tanResult.toPrecision(12)));
      break;
    }

    /* ── Logarithms ── */
    case 'log': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `log₁₀(${expression}) =`;
      if (v <= 0) { setError(v === 0 ? 'log(0) is −∞' : 'log of negative'); return; }
      expression = String(parseFloat(Math.log10(v).toPrecision(12)));
      break;
    }
    case 'ln': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const v = parseFloat(res.value);
      historyEl.textContent = `ln(${expression}) =`;
      if (v <= 0) { setError(v === 0 ? 'ln(0) is −∞' : 'ln of negative'); return; }
      expression = String(parseFloat(Math.log(v).toPrecision(12)));
      break;
    }

    /* ── Factorial ── */
    case 'fact': {
      const res = evaluate(expression);
      if (res.error) { setError(res.error); return; }
      const raw = parseFloat(res.value);
      historyEl.textContent = `${expression}! =`;
      if (raw < 0)        { setError('Factorial of negative'); return; }
      if (raw !== Math.floor(raw)) { setError('Factorial needs integer'); return; }
      if (raw > 170)      { setError('Too large (> 170!)'); return; }
      let f = 1;
      for (let i = 2; i <= raw; i++) f *= i;
      expression = String(f);
      break;
    }

    /* ── Toggle angle mode ── */
    case 'toggleAngle':
      angleMode = angleMode === 'deg' ? 'rad' : 'deg';
      angleBadge.textContent = angleMode.toUpperCase();
      angleBadge.style.color = angleMode === 'rad' ? 'var(--accent)' : 'var(--accent2)';
      angleBadge.style.background = angleMode === 'rad' ? 'rgba(167,139,250,0.12)' : 'rgba(56,189,248,0.12)';
      angleBadge.style.borderColor = angleMode === 'rad' ? 'rgba(167,139,250,0.25)' : 'rgba(56,189,248,0.25)';
      return;

    default: break;
  }

  updateDisplay(expression || '');
}

/* ── Delegate button clicks ── */
document.querySelector('.buttons').addEventListener('click', e => {
  const btn = e.target.closest('[data-value]');
  if (!btn) return;
  handleButton(btn.dataset.value);

  // Ripple animation
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 200);
});

/* ── Keyboard support ── */
document.addEventListener('keydown', e => {
  // Ignore if user is typing into auth fields
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT') return;

  const map = {
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    '+':'+','-':'-','*':'*','/':'/','%':'%',
    'Enter':'=','=':'=','Backspace':'back','Escape':'clear',
    '.':'dot'
  };
  if (map[e.key]) { e.preventDefault(); handleButton(map[e.key]); }
});

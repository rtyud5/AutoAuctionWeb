// backend/src/utils/captcha.util.js
// Simple arithmetic captcha helper.

export const generateCaptcha = (req) => {
  // Create a simple arithmetic question (small integers) and store the answer in session
  const a = Math.floor(Math.random() * 9) + 1; // 1..9
  const b = Math.floor(Math.random() * 9) + 1; // 1..9
  const ops = ['+','-','*'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let answer;
  let question;
  switch (op) {
    case '+':
      answer = a + b;
      question = `${a} + ${b} = ?`;
      break;
    case '-':
      answer = a - b;
      question = `${a} - ${b} = ?`;
      break;
    case '*':
      answer = a * b;
      question = `${a} × ${b} = ?`;
      break;
  }

  if (req && req.session) {
    // store as string to avoid type coercion issues
    req.session.captchaAnswer = String(answer);
    // optional: timestamp
    req.session.captchaAt = Date.now();
  }

  return { question, answer };
};

export const verifyCaptcha = (req, provided) => {
  if (!req || !req.session) return false;
  const expected = req.session.captchaAnswer;
  // Clear stored answer to prevent reuse
  delete req.session.captchaAnswer;
  delete req.session.captchaAt;
  if (!expected) return false;
  return String(provided).trim() === String(expected).trim();
};

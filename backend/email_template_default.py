DEFAULT_EMAIL_TEMPLATE = """<!DOCTYPE HTML
  PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to Design Hive, {{name}}!</title>
  <style type="text/css">
    * { box-sizing: border-box; line-height: inherit; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; background-color: #07090f; font-family: 'DM Sans', sans-serif; }
    table, td, tr { border-collapse: collapse; vertical-align: top; }
    a { color: inherit; }
    .email-wrapper { background-color: #07090f; width: 100%; padding: 40px 0 60px; }
    .email-container { max-width: 620px; margin: 0 auto; padding: 0 20px; }
    .header { text-align: center; padding: 0 0 28px; position: relative; }
    .hero-card { background: linear-gradient(160deg, #131b2e 0%, #0f1520 60%, #0c1119 100%); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255, 159, 28, 0.12); box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04); position: relative; margin-bottom: 16px; }
    .hero-top-bar { height: 3px; background: linear-gradient(90deg, transparent 0%, #ff9f1c 40%, #ffc84a 60%, transparent 100%); }
    .hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 300px; height: 200px; background: radial-gradient(ellipse, rgba(255, 159, 28, 0.12) 0%, transparent 70%); pointer-events: none; }
    .hero-body { padding: 56px 48px 48px; text-align: center; position: relative; }
    .welcome-eyebrow { display: inline-block; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #ff9f1c; background: rgba(255, 159, 28, 0.1); border: 1px solid rgba(255, 159, 28, 0.25); padding: 6px 18px; border-radius: 30px; margin-bottom: 28px; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 58px; font-weight: 700; line-height: 1.05; color: #ffffff; margin: 0 0 8px; letter-spacing: -0.01em; }
    .hero-title span { color: #ff9f1c; font-style: italic; }
    .hero-subtitle { font-size: 17px; color: rgba(255, 255, 255, 0.55); font-weight: 300; margin: 0 0 36px; letter-spacing: 0.01em; }
    .hero-name-highlight { color: rgba(255, 255, 255, 0.9); font-weight: 500; }
    .account-box { background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 159, 28, 0.2); border-radius: 12px; padding: 24px 28px; margin: 0 0 36px; text-align: left; position: relative; overflow: hidden; }
    .account-box::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: linear-gradient(180deg, #ff9f1c, #ffc84a); }
    .account-box-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #ff9f1c; margin-bottom: 16px; display: block; }
    .account-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 15px; }
    .account-row:last-child { margin-bottom: 0; }
    .account-row-key { color: rgba(255, 255, 255, 0.4); font-weight: 400; width: 64px; flex-shrink: 0; font-size: 13px; font-family: 'Space Mono', monospace; }
    .account-row-val { color: #ffffff; font-weight: 500; font-size: 15px; }
    .hero-desc { font-size: 16px; color: rgba(255, 255, 255, 0.5); line-height: 1.75; margin: 0 0 40px; max-width: 420px; margin-left: auto; margin-right: auto; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #ff9f1c 0%, #ffb84a 100%); color: #07090f; padding: 17px 52px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; box-shadow: 0 8px 32px rgba(255, 159, 28, 0.35), 0 2px 8px rgba(255, 159, 28, 0.2); }
    .cta-subtext { font-size: 12px; color: rgba(255, 255, 255, 0.25); margin-top: 14px; font-family: 'Space Mono', monospace; letter-spacing: 0.05em; }
    .section-gap { height: 16px; }
    .next-card { background: linear-gradient(160deg, #131b2e 0%, #0f1520 100%); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); overflow: hidden; margin-bottom: 16px; }
    .next-card-body { padding: 44px 48px; }
    .section-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255, 159, 28, 0.6); margin-bottom: 10px; display: block; }
    .section-title { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 700; color: #ffffff; margin: 0 0 36px; line-height: 1.1; }
    .section-title span { color: #ff9f1c; font-style: italic; }
    .step-item { display: flex; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .step-item:last-of-type { border-bottom: none; }
    .step-number { font-family: 'Space Mono', monospace; font-size: 11px; color: #ff9f1c; background: rgba(255, 159, 28, 0.1); border: 1px solid rgba(255, 159, 28, 0.2); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 18px; margin-top: 2px; text-align: center; line-height: 34px; }
    .step-content-title { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    .step-content-desc { font-size: 14px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; }
    .closing-wrap { margin-top: 36px; padding-top: 36px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
    .closing-text { font-size: 15px; color: rgba(255, 255, 255, 0.45); line-height: 1.8; margin: 0 0 20px; }
    .closing-sig { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; font-style: italic; color: rgba(255, 255, 255, 0.75); }
    .features-card { background: linear-gradient(135deg, rgba(255, 159, 28, 0.06) 0%, rgba(255, 199, 100, 0.02) 100%); border-radius: 20px; border: 1px solid rgba(255, 159, 28, 0.12); padding: 40px 48px; margin-bottom: 16px; text-align: center; }
    .features-grid { display: table; width: 100%; margin-top: 28px; border-collapse: separate; border-spacing: 0; }
    .features-grid-row { display: table-row; }
    .feature-cell { display: table-cell; width: 33.33%; padding: 0 10px; vertical-align: top; text-align: center; }
    .feature-icon { font-size: 28px; margin-bottom: 12px; display: block; }
    .feature-title { font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 6px; letter-spacing: 0.02em; }
    .feature-desc { font-size: 12px; color: rgba(255, 255, 255, 0.3); line-height: 1.6; }
    .footer { text-align: center; padding: 40px 20px 0; }
    .social-row { margin-bottom: 30px; }
    .social-link { display: inline-block; width: 42px; height: 42px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 50%; text-align: center; line-height: 42px; margin: 0 6px; font-size: 16px; text-decoration: none; color: rgba(255, 255, 255, 0.5); }
    .footer-logo { margin-bottom: 24px; }
    .footer-logo-text { font-family: 'Space Mono', monospace; font-size: 16px; font-weight: 700; color: rgba(255, 159, 28, 0.5); letter-spacing: 0.3em; text-transform: uppercase; }
    .footer-dot { display: inline-block; width: 6px; height: 6px; background: rgba(255, 159, 28, 0.5); border-radius: 50%; margin: 0 4px 1px; vertical-align: middle; }
    .footer-legal { font-size: 12px; color: rgba(255, 255, 255, 0.2); line-height: 2; }
    .footer-legal a { color: rgba(255, 159, 28, 0.6); text-decoration: none; }
    .footer-divider { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 159, 28, 0.3), transparent); margin: 24px auto; }
    @media only screen and (max-width: 620px) {
      .hero-body { padding: 40px 24px 36px !important; }
      .hero-title { font-size: 40px !important; }
      .next-card-body { padding: 32px 24px !important; }
      .features-card { padding: 32px 20px !important; }
      .feature-cell { display: block !important; width: 100% !important; padding: 12px 0 !important; }
      .features-grid, .features-grid-row { display: block !important; }
      .account-box { padding: 20px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <div class="header-logo-wrap" style="background: none; border: none; backdrop-filter: none; padding: 0;">
          <img src="/assets/brand/header_logo_v4.png" style="height: 78px; width: auto; max-width: 300px; display: block; margin: 0 auto;" alt="Design Hive Logo">
        </div>
      </div>
      <div class="hero-card">
        <div class="hero-top-bar"></div>
        <div class="hero-glow"></div>
        <div class="hero-body">
          <div class="welcome-eyebrow">&#10022; &nbsp; New Member &nbsp; &#10022;</div>
          <h1 class="hero-title">Welcome<br><span>Aboard.</span></h1>
          <p class="hero-subtitle">Hello, <span class="hero-name-highlight">{{name}}</span> &mdash; your journey officially starts now.</p>
          <div class="account-box">
            <span class="account-box-label">Your Account</span>
            <div class="account-row"><span class="account-row-key">Name</span><span class="account-row-val">{{name}}</span></div>
            <div class="account-row"><span class="account-row-key">Email</span><span class="account-row-val">{{email}}</span></div>
            <div class="account-row"><span class="account-row-key">Date</span><span class="account-row-val" style="color:#ff9f1c;">{{date}}</span></div>
          </div>
          <p class="hero-desc">You now have access to powerful tools designed to help you move faster, build smarter, and scale effortlessly.</p>
          <a href="/dashboard.html" target="_blank" class="cta-button">Go to Dashboard &rarr;</a>
          <p class="cta-subtext">No credit card required &nbsp;&middot;&nbsp; Cancel anytime</p>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="features-card">
        <span class="section-eyebrow">What you unlock</span>
        <div class="section-title" style="text-align:center; font-size: 28px;">Everything you need,<br><span>right out of the box.</span></div>
        <div class="features-grid">
          <div class="features-grid-row">
            <div class="feature-cell"><span class="feature-icon">&#9889;</span><div class="feature-title">Instant Setup</div><div class="feature-desc">Go live in minutes with pre-built templates.</div></div>
            <div class="feature-cell"><span class="feature-icon">&#127912;</span><div class="feature-title">Design Tools</div><div class="feature-desc">Pro-grade tools designed for creative work.</div></div>
            <div class="feature-cell"><span class="feature-icon">&#128202;</span><div class="feature-title">Analytics</div><div class="feature-desc">Track performance with real-time insights.</div></div>
          </div>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="next-card">
        <div class="next-card-body">
          <span class="section-eyebrow">Getting started</span>
          <div class="section-title">What to do <span>next</span></div>
          <div class="step-item"><div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">01</div><div><div class="step-content-title">Explore your dashboard</div><div class="step-content-desc">Get familiar with your workspace &mdash; everything's been set up just for you.</div></div></div>
          <div class="step-item"><div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">02</div><div><div class="step-content-title">Start your first project</div><div class="step-content-desc">Create something great. Use our templates or start from scratch.</div></div></div>
          <div class="step-item"><div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">03</div><div><div class="step-content-title">Customize your workflow</div><div class="step-content-desc">Tailor Design Hive to the way you work &mdash; integrations, preferences &amp; more.</div></div></div>
          <div class="closing-wrap">
            <p class="closing-text">This is just the beginning &mdash; we've built this experience to grow with you. Whenever you need help, just reply to this email. We're always here.</p>
            <div class="closing-sig">&mdash; The Design Hive Team</div>
          </div>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="footer">
        <div class="social-row">
          <a href="#" class="social-link" title="Facebook">f</a>
          <a href="#" class="social-link" title="LinkedIn" style="font-size:13px;">in</a>
          <a href="#" class="social-link" title="Instagram">&#10022;</a>
          <a href="#" class="social-link" title="X / Twitter">X</a>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-logo"><span class="footer-logo-text">Design<span class="footer-dot"></span>Hive</span></div>
        <p class="footer-legal">You're receiving this because you signed up for Design Hive.<br><a href="#">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="#">Privacy Policy</a> &nbsp;&middot;&nbsp; <a href="#">View in Browser</a></p>
        <div class="footer-divider"></div>
        <p class="footer-legal" style="font-size: 11px; margin-top: 0;">&copy; 2025 Design Hive. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>"""

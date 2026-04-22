def build_direct_email_html(body_content: str) -> str:
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #e8e8e8; }}
    table {{ border-collapse: collapse; }}
    img {{ border: 0; outline: none; text-decoration: none; }}
    @media only screen and (max-width: 620px) {{
      .outer-td {{ padding: 24px 12px 32px !important; }}
      .header-td {{ padding: 28px 24px 24px !important; }}
      .header-td img {{ width: 160px !important; }}
      .content-td {{ padding: 32px 24px !important; }}
      .footer-td {{ padding: 24px 20px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
    <tr>
      <td class="outer-td" align="center" valign="top" style="padding:48px 16px 56px;">

        <table width="100%" border="0" border-radius="16px" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER: deep maroon gradient with logo ── -->
          <tr>
            <td class="header-td" align="center" valign="middle"
                style="background:linear-gradient(150deg,#6e1212 0%,#9a1e1e 50%,#6e1212 100%);
                       border-radius:16px 16px 0 0;
                       padding:42px 40px 38px;">
              <a href="https://designhivestudio.ai" target="_blank"
                 style="text-decoration:none;border:0;display:block;">
                <img src="https://admin.designhivestudio.ai/assets/brand/header_logo_v4.png"
                     width="200" height="auto" alt="Design Hive"
                     style="display:block;margin:0 auto;width:200px;max-width:100%;height:auto;border:0;">
              </a>
            </td>
          </tr>

          <!-- ── ACCENT LINE under header ── -->
          <tr>
            <td height="4"
                style="background:linear-gradient(90deg,#6e1212,#c43535,#6e1212);
                       height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
          </tr>

          <!-- ── MESSAGE BODY ── -->
          <tr>
            <td class="content-td" valign="top"
                style="background:#ffffff;padding:48px 52px; border:1px solid #e0e0e0; border-top:0;">
              <div style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                          font-size:16px;
                          font-weight:400;
                          line-height:1.85;
                          color:#1c1c2e;
                          letter-spacing:0.012em;">
                {body_content}
              </div>
            </td>
          </tr>

          <!-- ── FOOTER: light grey ── -->
          <tr>
            <td class="footer-td" align="center" valign="top"
                style="background:#f4f4f4;
                       border-top:1px solid #e0e0e0;
                       border-radius:0 0 16px 16px;
                       padding:28px 40px 26px;">

              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                        font-size:13px;
                        font-weight:400;
                        color:#5c5c6e;
                        line-height:1.75;
                        margin:0 0 8px;
                        text-align:center;">
                We at Design Hive take great care of our users.<br>
                For any concerns or issues, reach out to us:
              </p>

              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                        font-size:13px;
                        font-weight:600;
                        color:#1c1c2e;
                        margin:0 0 20px;
                        text-align:center;">
                Email:&nbsp;
                <a href="mailto:info@designhiveai.com.au"
                   style="color:#8b1a1a;text-decoration:none;">
                  info@designhiveai.com.au
                </a>
              </p>

              <table border="0" cellpadding="0" cellspacing="0" width="80%" style="margin:0 auto;">
                <tr>
                  <td style="border-top:1px solid #dcdcdc;height:1px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                        font-size:11px;
                        font-weight:400;
                        color:#aaaaaa;
                        margin:16px 0 0;
                        text-align:center;
                        letter-spacing:0.04em;">
                &copy; 2025 DesignHive Studio &nbsp;&middot;&nbsp;
                <a href="https://designhivestudio.ai"
                   style="color:#aaaaaa;text-decoration:none;">designhivestudio.ai</a>
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

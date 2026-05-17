_DEFAULT_CTA_URL = "https://admin.designhivestudio.ai/dashboard.html"

_OUTER_STYLE = """<style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #ffffff; }}
    table {{ border-collapse: collapse; }}
    img {{ border: 0; outline: none; text-decoration: none; }}
    @media only screen and (max-width: 620px) {{
      .outer-td  {{ padding: 24px 12px 32px !important; }}
      .header-td {{ padding: 28px 24px 24px !important; }}
      .header-td img {{ width: 160px !important; }}
      .footer-td {{ padding: 24px 20px !important; }}
      .dh-pad    {{ padding-left: 20px !important; padding-right: 20px !important; }}
      .dh-heading {{ font-size: 22px !important; line-height: 1.25 !important; }}
      .dh-subheading {{ font-size: 15px !important; }}
      .dh-cta-td {{ padding: 14px 32px !important; }}
      .dh-hero-img {{ border-radius: 0 !important; }}
    }}
  </style>"""


def build_direct_email_html(body_content: str) -> str:
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600&display=swap" rel="stylesheet" type="text/css">
  {_OUTER_STYLE}
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
    <tr>
      <td class="outer-td" align="center" valign="top" style="padding:48px 16px 56px;">

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER: deep maroon gradient with logo -->
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

          <!-- ACCENT LINE -->
          <tr>
            <td height="4"
                style="background:linear-gradient(90deg,#6e1212,#c43535,#6e1212);
                       height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
          </tr>

          <!-- MESSAGE BODY -->
          <tr>
            <td class="content-td" valign="top" style="padding:0;">
              {body_content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-td" align="center" valign="top"
                style="background:#f4f4f4;
                       border-top:1px solid #e0e0e0;
                       border-radius:0 0 16px 16px;
                       padding:28px 40px 26px;">

              <!-- Social icons using CDN images -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="padding:0 8px;">
                    <a href="https://www.instagram.com/designhiveai?igsh=MTRxbm82ZmR4d2tscg%3D%3D&utm_source=qr"
                       target="_blank" style="display:inline-block;text-decoration:none;">
                      <img src="https://img.icons8.com/color/36/instagram-new--v1.png"
                           alt="Instagram" width="36" height="36"
                           style="display:block;width:36px;height:36px;border:0;">
                    </a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://www.facebook.com/share/1BBFb4PyGv/?mibextid=wwXIfr"
                       target="_blank" style="display:inline-block;text-decoration:none;">
                      <img src="https://img.icons8.com/color/36/facebook-new.png"
                           alt="Facebook" width="36" height="36"
                           style="display:block;width:36px;height:36px;border:0;">
                    </a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://www.tiktok.com/@designhiveai?_r=1&amp;_t=ZS-96QLN5b0bdS"
                       target="_blank" style="display:inline-block;text-decoration:none;">
                      <img src="https://img.icons8.com/color/36/tiktok--v1.png"
                           alt="TikTok" width="36" height="36"
                           style="display:block;width:36px;height:36px;border:0;">
                    </a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="https://www.reddit.com/u/designhive23/s/o7PoAOvEpT"
                       target="_blank" style="display:inline-block;text-decoration:none;">
                      <img src="https://img.icons8.com/color/36/reddit.png"
                           alt="Reddit" width="36" height="36"
                           style="display:block;width:36px;height:36px;border:0;">
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                        font-size:13px;font-weight:400;color:#5c5c6e;
                        line-height:1.75;margin:0 0 8px;text-align:center;">
                We at Design Hive take great care of our users.<br>
                For any concerns or issues, reach out to us:
              </p>

              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                        font-size:13px;font-weight:600;color:#1c1c2e;
                        margin:0 0 20px;text-align:center;">
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
                        font-size:11px;font-weight:400;color:#aaaaaa;
                        margin:16px 0 0;text-align:center;letter-spacing:0.04em;">
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


def build_text_email_html(
    heading: str,
    subheading: str,
    paragraphs: list,
    sign_off: str = "— The Design Hive Team",
    hero_image_url: str | None = None,
    cta_url: str | None = None,
    cta_text: str | None = None,
) -> str:
    """Build a complete email from structured text content in a fixed, mobile-safe template."""

    # Hero image block
    if hero_image_url:
        hero_section = f"""
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img class="dh-hero-img" src="{hero_image_url}" alt="Design Hive"
                   width="600"
                   style="display:block;width:100%;max-width:600px;height:220px;
                          object-fit:cover;border:0;">
            </td>
          </tr>"""
    else:
        hero_section = ""

    # Paragraph rows
    para_rows = ""
    for para in paragraphs:
        para_rows += f"""
          <tr>
            <td class="dh-pad"
                style="padding:0 40px 18px;">
              <p style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
                        font-size:16px;color:#374151;line-height:1.85;margin:0;">
                {para}
              </p>
            </td>
          </tr>"""

    # CTA button block
    effective_cta_url = cta_url or _DEFAULT_CTA_URL
    if cta_text:
        cta_section = f"""
          <tr>
            <td align="center" style="padding:32px 40px 8px;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td class="dh-cta-td" align="center"
                      style="background:linear-gradient(135deg,#7a1515 0%,#a52020 100%);
                             border-radius:8px;padding:16px 48px;
                             mso-padding-alt:16px 48px;">
                    <a href="{effective_cta_url}" target="_blank"
                       style="color:#ffffff;font-family:'DM Sans',system-ui,sans-serif;
                              font-weight:700;font-size:15px;text-decoration:none;
                              letter-spacing:0.03em;white-space:nowrap;display:inline-block;">
                      {cta_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""
    else:
        cta_section = ""

    inner_body = f"""<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
        {hero_section}
          <tr>
            <td class="dh-pad" align="center" style="padding:40px 40px 8px;">
              <p style="font-family:'DM Sans',system-ui,sans-serif;font-size:11px;font-weight:600;
                        letter-spacing:0.2em;text-transform:uppercase;color:#8b1a1a;margin:0 0 16px;">
                &#10022; &nbsp; Design Hive Studio &nbsp; &#10022;
              </p>
              <h1 class="dh-heading"
                  style="font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
                         font-weight:700;font-size:28px;color:#111827;line-height:1.2;
                         margin:0 0 14px;letter-spacing:-0.01em;">
                {heading}
              </h1>
              <p class="dh-subheading"
                 style="font-family:'DM Sans',system-ui,sans-serif;font-size:16px;
                        color:#6b7280;line-height:1.65;margin:0;">
                {subheading}
              </p>
            </td>
          </tr>
          <tr>
            <td class="dh-pad" style="padding:20px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f0f0f0;height:1px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
        {para_rows}
        {cta_section}
          <tr>
            <td class="dh-pad" style="padding:24px 40px 40px;">
              <p style="font-family:'DM Sans',system-ui,sans-serif;font-size:15px;
                        color:#9ca3af;line-height:1.8;margin:0;font-style:italic;">
                {sign_off}
              </p>
            </td>
          </tr>
        </table>"""

    return build_direct_email_html(inner_body)

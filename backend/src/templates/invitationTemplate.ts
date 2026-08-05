export const invitationTemplate = (
  influencerName: string,
  campaignName: string,
  inviteLink: string,
  businessName: string,
  personalMessage?: string
) => {
  const messageBlock = personalMessage?.trim()
    ? `
<div style="
background:#fffbeb;
border-left:4px solid #f59e0b;
padding:18px;
border-radius:12px;
margin:20px 0;
">
<p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:600;">
Message from ${businessName}:
</p>
<p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;white-space:pre-wrap;">
${personalMessage.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}
</p>
</div>
`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Mashhoor Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

<tr>
<td style="
background:linear-gradient(135deg,#5B21B6,#2563EB);
padding:40px;
text-align:center;
">
<h1 style="
margin:0;
color:#ffffff;
font-size:34px;
font-weight:700;
letter-spacing:1px;
">
Mashhoor
</h1>

<p style="
margin-top:10px;
color:#e9e9ff;
font-size:16px;
">
AI-Powered Influencer Marketing Platform
</p>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="
color:#1f2937;
margin-top:0;
font-size:26px;
">
Hello ${influencerName} 👋
</h2>

<p style="
font-size:16px;
line-height:1.8;
color:#4b5563;
">
You have received a collaboration invitation through
<strong>Mashhoor</strong>.
A business is interested in working with you for an upcoming campaign.
</p>

<div style="
background:#f8f9ff;
border-left:4px solid #5B21B6;
padding:20px;
border-radius:12px;
margin:25px 0;
">
<p style="margin:0;font-size:15px;color:#4b5563;">
<strong>Campaign:</strong> ${campaignName}
</p>

<p style="margin:12px 0 0;font-size:15px;color:#4b5563;">
<strong>Business:</strong> ${businessName}
</p>
</div>
${messageBlock}
<p style="
font-size:16px;
line-height:1.8;
color:#4b5563;
">
Join Mashhoor to view campaign details, communicate with brands,
track collaborations, and grow your influencer profile.
</p>

<div style="text-align:center;margin:40px 0;">

<a href="${inviteLink}"
style="
background:linear-gradient(135deg,#5B21B6,#2563EB);
color:white;
text-decoration:none;
padding:16px 32px;
border-radius:12px;
font-size:16px;
font-weight:600;
display:inline-block;
">
Accept Invitation </a>

</div>

<p style="
font-size:14px;
color:#6b7280;
line-height:1.8;
">
If the button doesn't work, copy and paste the following link into your browser:
</p>

<p style="
font-size:13px;
word-break:break-all;
color:#2563EB;
">
${inviteLink}
</p>

</td>
</tr>

<tr>
<td style="
background:#f8fafc;
padding:25px;
text-align:center;
border-top:1px solid #e5e7eb;
">

<p style="
margin:0;
font-size:13px;
color:#6b7280;
">
© 2026 Mashhoor — AI-Powered Influencer Marketing Platform
</p>

<p style="
margin-top:10px;
font-size:12px;
color:#9ca3af;
">
Connecting Businesses with the Right Influencers
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};

const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  try {
    // 1. Create a Test Account (Ethereal) - Perfect for Dev Mode
    // In a real app, you would put these credentials in your .env file
    const testAccount = await nodemailer.createTestAccount();

    // 2. Create Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    // 3. Send Email
    const info = await transporter.sendMail({
      from: '"ProofDIn Recruiter" <recruiter@proofdin.com>', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plain text body
      html: `<b>${text.replace(/\n/g, '<br>')}</b>`, // html body
    });

    console.log("Message sent: %s", info.messageId);
    
    // 4. Return the Preview URL (This is the magic part!)
    // The frontend can open this link to "prove" the email was sent.
    return nodemailer.getTestMessageUrl(info);

  } catch (error) {
    console.error("Email Error:", error);
    return null;
  }
};

module.exports = sendEmail;
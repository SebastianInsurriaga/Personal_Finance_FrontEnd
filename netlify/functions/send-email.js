import nodemailer from 'nodemailer';

exports.handler = async (event, context) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let body;
    
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    const { jsonData, userEmail } = body;

    if (!jsonData || !userEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          details: 'jsonData and userEmail are required' 
        })
      };
    }

    // Validar variables de entorno
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.error('Gmail configuration missing:', {
        hasUser: !!gmailUser,
        hasPassword: !!gmailPassword
      });
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Gmail credentials not configured on server'
        })
      };
    }

    // Crear transporte de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Verificar la conexión
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('Gmail authentication failed:', verifyError.message);
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Gmail authentication failed',
          details: 'Verify your Gmail credentials in environment variables'
        })
      };
    }

    // Preparar el archivo JSON
    const filename = `finanzas-personales-${new Date().toISOString().slice(0, 10)}.json`;

    // Enviar email
    const info = await transporter.sendMail({
      from: gmailUser,
      to: userEmail,
      subject: 'Backup de tus datos financieros personales',
      html: `
        <h2>Backup de tus datos financieros</h2>
        <p>Adjuntado encontrarás tu backup en formato JSON.</p>
        <p>Puedes importar este archivo cuando quieras en la sección de Configuración.</p>
        <hr>
        <p><small>Este email fue generado automáticamente por tu aplicación de finanzas personales.</small></p>
      `,
      attachments: [
        {
          filename,
          content: jsonData,
          contentType: 'application/json',
        },
      ],
    });

    console.log('Email sent:', info.messageId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Email enviado correctamente',
        messageId: info.messageId
      })
    };
  } catch (error) {
    console.error('Error enviando email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error al enviar el email',
        details: error.message
      })
    };
  }
};

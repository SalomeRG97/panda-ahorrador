export interface EmailJSConfig {
  serviceId: string;
  templateIdVerification: string;
  templateIdViewerInvite: string;
  publicKey: string;
}

export const EmailService = {
  config: {
    serviceId: 'YOUR_EMAILJS_SERVICE_ID',
    templateIdVerification: 'YOUR_TEMPLATE_ID_VERIFICATION',
    templateIdViewerInvite: 'YOUR_TEMPLATE_ID_VIEWER_INVITE',
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',
  } as EmailJSConfig,

  async sendVerificationEmail(toEmail: string, userName: string): Promise<boolean> {
    console.log(`[EmailService] Enviando correo de verificación a: ${toEmail}`);
    return this.sendEmail(this.config.templateIdVerification, {
      to_email: toEmail,
      user_name: userName,
      verification_link: `${window.location.origin}/login`,
      app_name: '熊猫理财 El Panda Ahorrador',
    });
  },

  async sendViewerInvitation(toEmail: string, ownerName: string): Promise<boolean> {
    console.log(`[EmailService] Enviando invitación de observador a: ${toEmail} de parte de ${ownerName}`);
    return this.sendEmail(this.config.templateIdViewerInvite, {
      to_email: toEmail,
      owner_name: ownerName,
      login_link: `${window.location.origin}/login`,
      app_name: '熊猫理财 El Panda Ahorrador',
    });
  },

  async sendEmail(templateId: string, templateParams: Record<string, any>): Promise<boolean> {
    if (this.config.publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
      console.warn('[EmailService] Configura tus llaves de EmailJS para habilitar el envío real de correos.');
      console.log('[EmailService] Parámetros enviados:', templateParams);
      return true;
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: this.config.serviceId,
          template_id: templateId,
          user_id: this.config.publicKey,
          template_params: templateParams,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailService] Error EmailJS:', errorText);
        return false;
      }

      console.log('[EmailService] Correo enviado con éxito vía EmailJS API!');
      return true;
    } catch (err) {
      console.error('[EmailService] Error al enviar email:', err);
      return false;
    }
  },
};

import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email, action, code, newPassword } = await request.json();

    if (!process.env.AWS_COGNITO_CLIENT_ID) {
      return NextResponse.json({ error: 'Configuração Cognito incompleta.' }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    // Initiate forgot password flow
    if (action === 'init') {
      try {
        const command = new ForgotPasswordCommand({
          ClientId: process.env.AWS_COGNITO_CLIENT_ID,
          Username: email,
        });
        await cognitoClient.send(command);
        return NextResponse.json({ success: true, message: 'Código enviado para o email (se existir).' });
      } catch (err: any) {
        console.error('Erro ForgotPassword:', err);
        if (err.name === 'UserNotFoundException') {
          // Do not disclose existence of user
          return NextResponse.json({ success: true, message: 'Código enviado para o email (se existir).' });
        }
        return NextResponse.json({ error: 'Erro ao iniciar recuperação de senha.' }, { status: 500 });
      }
    }

    // Confirm new password using code
    if (action === 'confirm') {
      if (!code || !newPassword) {
        return NextResponse.json({ error: 'Código e nova senha são obrigatórios.' }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Nova senha deve ter no mínimo 8 caracteres.' }, { status: 400 });
      }
      try {
        const command = new ConfirmForgotPasswordCommand({
          ClientId: process.env.AWS_COGNITO_CLIENT_ID,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        });
        await cognitoClient.send(command);
        return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso.' });
      } catch (err: any) {
        console.error('Erro ConfirmForgotPassword:', err);
        if (err.name === 'CodeMismatchException') {
          return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
        }
        if (err.name === 'ExpiredCodeException') {
          return NextResponse.json({ error: 'Código expirado. Solicite novamente.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Erro ao confirmar nova senha.' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    console.error('Erro geral forgot-password:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export const config = {
  runtime: 'nodejs',
};

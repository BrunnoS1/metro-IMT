import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  GetUserCommand,
  RespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider'

// Chave secreta para JWT (para manter compatibilidade com o sistema atual)
const JWT_SECRET = process.env.JWT_SECRET || 'metro_sp_secret_2024'

// Configuração do Cognito
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, newPassword } = await request.json()

    console.log('Tentativa de login via Cognito:', { email, hasNewPassword: !!newPassword })

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar configuração do Cognito
    if (!process.env.AWS_COGNITO_CLIENT_ID || !process.env.AWS_COGNITO_USER_POOL_ID) {
      console.error('Configuração do Cognito incompleta')
      return NextResponse.json(
        { error: 'Configuração de autenticação incompleta' },
        { status: 500 }
      )
    }

    try {
      // Autenticar com Cognito usando USER_PASSWORD_AUTH
      const authCommand = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.AWS_COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })

      const authResponse = await cognitoClient.send(authCommand)

      console.log('Cognito auth response:', {
        hasResult: !!authResponse.AuthenticationResult,
        hasAccessToken: !!authResponse.AuthenticationResult?.AccessToken,
        hasIdToken: !!authResponse.AuthenticationResult?.IdToken,
        challengeName: authResponse.ChallengeName,
      })

      // Handle NEW_PASSWORD_REQUIRED challenge
      if (authResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        if (!newPassword) {
          return NextResponse.json(
            { 
              error: 'Nova senha obrigatória',
              challenge: 'NEW_PASSWORD_REQUIRED',
              session: authResponse.Session,
            },
            { status: 400 }
          )
        }

        // Respond to the challenge with new password
        const challengeCommand = new RespondToAuthChallengeCommand({
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          ClientId: process.env.AWS_COGNITO_CLIENT_ID,
          Session: authResponse.Session,
          ChallengeResponses: {
            USERNAME: email,
            NEW_PASSWORD: newPassword,
          },
        })

        const challengeResponse = await cognitoClient.send(challengeCommand)

        if (!challengeResponse.AuthenticationResult?.AccessToken) {
          console.error('Challenge response sem AccessToken:', challengeResponse)
          return NextResponse.json(
            { error: 'Falha ao definir nova senha' },
            { status: 401 }
          )
        }

        // Update authResponse with the challenge response
        authResponse.AuthenticationResult = challengeResponse.AuthenticationResult
      }

      if (!authResponse.AuthenticationResult?.AccessToken) {
        console.error('Auth response sem AccessToken:', authResponse)
        return NextResponse.json(
          { error: 'Falha na autenticação' },
          { status: 401 }
        )
      }

      const accessToken = authResponse.AuthenticationResult.AccessToken

      // Buscar informações do usuário
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken,
      })

      const userResponse = await cognitoClient.send(getUserCommand)

      // Extrair atributos do usuário
      const userAttributes = userResponse.UserAttributes || []
      const name = userAttributes.find((attr: any) => attr.Name === 'name')?.Value || 
                   userAttributes.find((attr: any) => attr.Name === 'given_name')?.Value ||
                   email.split('@')[0]
      const userId = userResponse.Username || email

      // Gerar token JWT para manter compatibilidade com o sistema atual
      const token = jwt.sign(
        { 
          userId,
          email,
          name,
          cognitoAccessToken: accessToken,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      console.log('Login via Cognito bem-sucedido:', { email, name })

      // Resposta de sucesso
      return NextResponse.json({
        success: true,
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: userId,
          email,
          name,
        }
      })

    } catch (cognitoError: any) {
      console.error('Erro no Cognito:', cognitoError)
      console.error('Erro detalhado:', {
        name: cognitoError.name,
        message: cognitoError.message,
        code: cognitoError.code,
        statusCode: cognitoError.$metadata?.httpStatusCode,
      })
      
      // Tratar erros específicos do Cognito
      if (cognitoError.name === 'InvalidParameterException') {
        return NextResponse.json(
          { error: 'Fluxo de autenticação USER_PASSWORD_AUTH não está habilitado. Configure o App Client no Cognito.' },
          { status: 500 }
        )
      }
      
      if (cognitoError.name === 'NotAuthorizedException') {
        return NextResponse.json(
          { error: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }
      
      if (cognitoError.name === 'UserNotFoundException') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 401 }
        )
      }

      if (cognitoError.name === 'UserNotConfirmedException') {
        return NextResponse.json(
          { error: 'Usuário não confirmado. Verifique seu email.' },
          { status: 401 }
        )
      }

      if (cognitoError.name === 'TooManyRequestsException') {
        return NextResponse.json(
          { error: 'Muitas tentativas. Tente novamente mais tarde.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: 'Erro na autenticação. Tente novamente.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
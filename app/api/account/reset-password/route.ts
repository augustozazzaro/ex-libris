import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request
) {
  try {
    const {
      email,
      code,
      newPassword,
    } = await request.json()

    if (
      !email ||
      !code ||
      !newPassword
    ) {
      return NextResponse.json(
        {
          error: 'Dati mancanti.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'La password deve contenere almeno 8 caratteri.',
        },
        {
          status: 400,
        }
      )
    }

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL

    const serviceKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            'Configurazione server incompleta.',
        },
        {
          status: 500,
        }
      )
    }

    const admin =
      createClient(
        url,
        serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

    const {
      data: userId,
      error: codeError,
    } = await admin.rpc(
      'consume_password_reset_code',
      {
        p_email:
          email.trim(),

        p_code:
          code.trim(),
      }
    )

    if (
      codeError ||
      !userId
    ) {
      return NextResponse.json(
        {
          error:
            'Codice non valido o scaduto.',
        },
        {
          status: 400,
        }
      )
    }

    const {
      error: passwordError,
    } = await admin.auth.admin.updateUserById(
      userId,
      {
        password:
          newPassword,
      }
    )

    if (passwordError) {
      return NextResponse.json(
        {
          error:
            'Non riesco a reimpostare la password.',
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch {
    return NextResponse.json(
      {
        error:
          'Errore durante il recupero.',
      },
      {
        status: 500,
      }
    )
  }
}

import bcrypt from 'bcrypt'
import readline from 'node:readline'
import { createInterface } from 'node:readline/promises'
import pool from '../config/database.js'

const BCRYPT_ROUNDS = 12
const MIN_PASSWORD_LENGTH = 12
const MAX_BCRYPT_BYTES = 72

function askText(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return rl.question(question).finally(() => rl.close())
}

function askSecret(question) {
  const input = process.stdin
  const output = process.stdout

  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(
      new Error('Password harus dimasukkan melalui terminal interaktif.'),
    )
  }

  return new Promise((resolve, reject) => {
    readline.emitKeypressEvents(input)

    output.write(question)

    input.setRawMode(true)
    input.resume()

    let value = ''

    function cleanup() {
      input.removeListener('keypress', handleKeypress)
      input.setRawMode(false)
      input.pause()
      output.write('\n')
    }

    function handleKeypress(character, key) {
      if (key?.ctrl && key.name === 'c') {
        cleanup()
        reject(new Error('Proses dibatalkan oleh pengguna.'))
        return
      }

      if (key?.name === 'return' || key?.name === 'enter') {
        cleanup()
        resolve(value)
        return
      }

      if (key?.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1)
          output.write('\b \b')
        }
        return
      }

      if (key?.ctrl || key?.meta || !character) {
        return
      }

      if (character.length > 0 && character !== '\u0000') {
        value += character
        output.write('*')
      }
    }

    input.on('keypress', handleKeypress)
  })
}

function validateName(name) {
  const normalized = name.trim()

  if (!normalized) {
    throw new Error('Nama Admin wajib diisi.')
  }

  if (normalized.length > 100) {
    throw new Error('Nama Admin maksimal 100 karakter.')
  }

  return normalized
}

function validateEmail(email) {
  const normalized = email.trim().toLowerCase()

  if (
    normalized.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error('Format email tidak valid.')
  }

  return normalized
}

async function getValidatedPassword() {
  while (true) {
    const password = await askSecret('Password Admin: ')

    const passwordLength = [...password].length
    const passwordBytes = Buffer.byteLength(password, 'utf8')

    if (passwordLength < MIN_PASSWORD_LENGTH) {
      console.log('Password minimal 12 karakter.\n')
      continue
    }

    if (passwordBytes > MAX_BCRYPT_BYTES) {
      console.log('Password maksimal 72 byte UTF-8.\n')
      continue
    }

    const confirmation = await askSecret('Konfirmasi password: ')

    if (password !== confirmation) {
      console.log('Konfirmasi password tidak cocok.\n')
      continue
    }

    return password
  }
}

async function createAdmin() {
  console.log('\n====================================')
  console.log('   JKI HOME CHURCH')
  console.log('   ADMIN PROVISIONING CLI')
  console.log('====================================\n')

  const name = validateName(
    await askText('Nama Admin: '),
  )

  const email = validateEmail(
    await askText('Email Admin: '),
  )

  const password = await getValidatedPassword()

  console.log('\nMemproses provisioning Admin...\n')

  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_ROUNDS,
  )

  let client
  let transactionStarted = false

  try {
    client = await pool.connect()

    await client.query('BEGIN')
    transactionStarted = true

    // Serialize provisioning attempts.
    // PostgreSQL will protect against concurrent inserts.
    await client.query(`
      LOCK TABLE public.admins IN EXCLUSIVE MODE
    `)

    const existingAdmin = await client.query(`
      SELECT id
      FROM public.admins
      LIMIT 1
    `)

    if (existingAdmin.rowCount > 0) {
      throw new Error('ADMIN_ALREADY_EXISTS')
    }

    const result = await client.query(
      `
        INSERT INTO public.admins (
          name,
          email,
          password_hash,
          password_changed_at
        )
        VALUES ($1, $2, $3, NOW())
        RETURNING id, name, email, created_at
      `,
      [name, email, passwordHash],
    )

    await client.query('COMMIT')
    transactionStarted = false

    const admin = result.rows[0]

    console.log('====================================')
    console.log('ADMIN BERHASIL DIBUAT')
    console.log('====================================')
    console.log(`ID      : ${admin.id}`)
    console.log(`Nama    : ${admin.name}`)
    console.log(`Email   : ${admin.email}`)
    console.log(`Created : ${admin.created_at}`)
    console.log('====================================')
    console.log('\nProvisioning selesai.\n')
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK')
      } catch {
        console.error('Database rollback gagal.')
      }
    }

    if (error.message === 'ADMIN_ALREADY_EXISTS') {
      console.error(
        '\nProvisioning ditolak: akun ADMIN sudah tersedia.',
      )
      console.error('Maksimal hanya satu akun ADMIN.\n')
      return
    }

    if (error.code === '23505') {
      console.error(
        '\nProvisioning gagal: data Admin melanggar unique constraint.',
      )
      return
    }

    console.error('\nProvisioning gagal.')
    console.error('Periksa konfigurasi database dan koneksi PostgreSQL.')
    process.exitCode = 1
  } finally {
    if (client) {
      client.release()
    }

    await pool.end()
  }
}

createAdmin().catch(async (error) => {
  console.error(`\n${error.message}\n`)
  process.exitCode = 1

  await pool.end()
})

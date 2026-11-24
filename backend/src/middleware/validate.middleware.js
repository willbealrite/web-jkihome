function validate(schema) {
  return (req, res, next) => {
    const validationErrors = []

    for (const [source, fields] of Object.entries(schema)) {
      const data = req[source] ?? {}

      if (typeof data !== 'object' || Array.isArray(data)) {
        validationErrors.push({
          field: source,
          message: `Bagian request ${source} tidak valid.`,
        })

        continue
      }

      for (const [field, rules] of Object.entries(fields)) {
        const value = data[field]

        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '')

        if (rules.required && isEmpty) {
          validationErrors.push({
            field,
            message: `${field} wajib diisi.`,
          })

          continue
        }

        if (isEmpty) {
          continue
        }

        if (rules.type === 'string' && typeof value !== 'string') {
          validationErrors.push({
            field,
            message: `${field} harus berupa teks.`,
          })

          continue
        }

        if (rules.type === 'number' && typeof value !== 'number') {
          validationErrors.push({
            field,
            message: `${field} harus berupa angka.`,
          })

          continue
        }

        if (rules.type === 'boolean' && typeof value !== 'boolean') {
          validationErrors.push({
            field,
            message: `${field} harus berupa boolean.`,
          })

          continue
        }

        if (
          rules.minLength &&
          typeof value === 'string' &&
          value.length < rules.minLength
        ) {
          validationErrors.push({
            field,
            message: `${field} minimal ${rules.minLength} karakter.`,
          })
        }

        if (
          rules.maxLength &&
          typeof value === 'string' &&
          value.length > rules.maxLength
        ) {
          validationErrors.push({
            field,
            message: `${field} maksimal ${rules.maxLength} karakter.`,
          })
        }

        if (rules.email && typeof value === 'string') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

          if (!emailPattern.test(value)) {
            validationErrors.push({
              field,
              message: `${field} harus menggunakan format email yang valid.`,
            })
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validasi request gagal.',
        errors: validationErrors,
      })
    }

    next()
  }
}

export default validate

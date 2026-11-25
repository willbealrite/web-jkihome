function validate(schema, options = {}) {
  const { statusCode = 400 } = options

  return (req, res, next) => {
    const validationErrors = []

    // ==================================================
    // 1. Validate Request Sources
    // ==================================================

    for (const [source, fields] of Object.entries(schema)) {
      const data = req[source] ?? {}

      if (typeof data !== 'object' || Array.isArray(data)) {
        validationErrors.push({
          field: source,
          message: `Bagian request ${source} tidak valid.`
        })

        continue
      }

      // ==================================================
      // 2. Validate Request Fields
      // ==================================================

      for (const [field, rules] of Object.entries(fields)) {
        const value = data[field]

        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '')

        if (rules.required && isEmpty) {
          validationErrors.push({
            field,
            message: `${field} wajib diisi.`
          })

          continue
        }

        if (isEmpty) {
          continue
        }

        // ==================================================
        // 3. Validate Data Types
        // ==================================================

        if (rules.type === 'string' && typeof value !== 'string') {
          validationErrors.push({
            field,
            message: `${field} harus berupa teks.`
          })

          continue
        }

        if (rules.type === 'number' && typeof value !== 'number') {
          validationErrors.push({
            field,
            message: `${field} harus berupa angka.`
          })

          continue
        }

        if (rules.type === 'boolean' && typeof value !== 'boolean') {
          validationErrors.push({
            field,
            message: `${field} harus berupa boolean.`
          })

          continue
        }

        // ==================================================
        // 4. Validate String Length
        // ==================================================

        if (
          rules.minLength !== undefined &&
          typeof value === 'string' &&
          value.length < rules.minLength
        ) {
          validationErrors.push({
            field,
            message: `${field} minimal ${rules.minLength} karakter.`
          })
        }

        if (
          rules.maxLength !== undefined &&
          typeof value === 'string' &&
          value.length > rules.maxLength
        ) {
          validationErrors.push({
            field,
            message: `${field} maksimal ${rules.maxLength} karakter.`
          })
        }

        // ==================================================
        // 5. Validate Email
        // ==================================================

        if (rules.email && typeof value === 'string') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

          if (!emailPattern.test(value)) {
            validationErrors.push({
              field,
              message: `${field} harus menggunakan format email yang valid.`
            })
          }
        }
      }
    }

    // ==================================================
    // 6. Return Validation Errors
    // ==================================================

    if (validationErrors.length > 0) {
      return res.status(statusCode).json({
        status: 'error',
        message: 'Validasi request gagal.',
        errors: validationErrors
      })
    }

    return next()
  }
}

export default validate

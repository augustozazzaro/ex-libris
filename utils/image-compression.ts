export async function compressAvatar(
  file: File
): Promise<Blob> {
  const bitmap =
    await createImageBitmap(
      file
    )

  const maxSize = 1024

  const scale =
    Math.min(
      1,
      maxSize /
        Math.max(
          bitmap.width,
          bitmap.height
        )
    )

  const width =
    Math.max(
      1,
      Math.round(
        bitmap.width *
          scale
      )
    )

  const height =
    Math.max(
      1,
      Math.round(
        bitmap.height *
          scale
      )
    )

  const canvas =
    document.createElement(
      'canvas'
    )

  canvas.width =
    width

  canvas.height =
    height

  const context =
    canvas.getContext(
      '2d'
    )

  if (!context) {
    bitmap.close()
    return file
  }

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  )

  bitmap.close()

  return await new Promise(
    resolve => {
      canvas.toBlob(
        blob =>
          resolve(
            blob ??
              file
          ),
        'image/webp',
        0.82
      )
    }
  )
}

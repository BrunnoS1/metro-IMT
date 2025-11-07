import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const worksite = formData.get('worksite') as string;
    const image = formData.get('image') as File;

    if (!worksite || !image) {
      return NextResponse.json(
        { error: 'Obra ou imagem não fornecida.' },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'O nome do bucket não está configurado.' },
        { status: 500 }
      );
    }

    // Generate a unique file name
    const fileExtension = image.name.split('.').pop(); // Extract file extension
    const baseFileName = image.name.replace(/\.[^/.]+$/, ''); // Remove extension from file name
    const uniqueSuffix = uuidv4().slice(0, 4); // Get 4 random characters from UUID
    const uniqueFileName = `${baseFileName}${uniqueSuffix}.${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: `obras/${worksite}/${uniqueFileName}`, // Updated file path
      Body: Buffer.from(await image.arrayBuffer()),
      ContentType: image.type,
    };

    await s3.upload(params).promise();

    return NextResponse.json({ message: 'Imagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar a imagem:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao enviar a imagem para o S3.', details: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs', // Ensure the route runs in the Node.js runtime
};

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

    // garante um nome unico pro arquivo
    // gera um sufixo unico com 4 digitos de um uuid
    // ex: fotos.jpeg -> fotos_ab12.jpeg
    const fileExtension = image.name.split('.').pop();
    const baseFileName = image.name.replace(/\.[^/.]+$/, '');
    const uniqueSuffix = uuidv4().slice(0, 4);
    const uniqueFileName = `${baseFileName}_${uniqueSuffix}.${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: `obras/${worksite}/fotos/${uniqueFileName}`,
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const worksite = url.searchParams.get('worksite');

    if (!worksite) {
      return NextResponse.json(
        { error: 'Obra não fornecida.' },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'O nome do bucket não está configurado.' },
        { status: 500 }
      );
    }

    const params = {
      Bucket: bucketName,
      Prefix: `obras/${worksite}/fotos/`,
    };

    const data = await s3.listObjectsV2(params).promise();

    const sortedFiles = (data.Contents || [])
      .sort((a, b) => ((a.LastModified ? a.LastModified.getTime() : 0) - (b.LastModified ? b.LastModified.getTime() : 0)))
      .map((file) => ({
        key: file.Key,
        url: `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${file.Key}`,
        lastModified: file.LastModified,
      }));

    return NextResponse.json(sortedFiles);
  } catch (error) {
    console.error('Erro ao listar os objetos:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao listar os objetos no S3.', details: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs', // Ensure the route runs in the Node.js runtime
};

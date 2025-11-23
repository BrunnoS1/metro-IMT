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

/* ------------------------------------------------------
   POST  → Upload de arquivo para S3
------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const worksite = formData.get('worksite') as string;
    const fileType = formData.get('type') as string;
    const file = formData.get('file') as File;

    if (!worksite || !file || !fileType) {
      return NextResponse.json(
        { error: 'Obra, tipo ou arquivo não fornecido.' },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'O nome do bucket não está configurado.' },
        { status: 500 }
      );
    }

    // gerar nome único
    const fileExtension = file.name.split('.').pop();
    const baseFileName = file.name.replace(/\.[^/.]+$/, '');
    const uniqueSuffix = uuidv4().slice(0, 4);
    const uniqueFileName = `${baseFileName}_${uniqueSuffix}.${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: `obras/${worksite}/${fileType}/${uniqueFileName}`,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    };

    await s3.upload(params).promise();

    return NextResponse.json({
      message: 'Imagem enviada com sucesso!',
      filename: uniqueFileName,
      key: `obras/${worksite}/${fileType}/${uniqueFileName}`,
      url: `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/obras/${worksite}/${fileType}/${uniqueFileName}`
    });
  } catch (error) {
    console.error('Erro ao enviar a imagem:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao enviar a imagem para o S3.', details: errorMessage },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------
   GET  → Listar arquivos de uma pasta no bucket
   (corrigido: SEM JSON quebrado)
------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const worksite = url.searchParams.get('worksite');
    const type = url.searchParams.get('type') || 'photos';

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

    const folder = type === 'bim' ? 'modeloBIM' : 'fotos';
    const prefix = `obras/${worksite}/${folder}/`;

    const data = await s3
      .listObjectsV2({
        Bucket: bucketName,
        Prefix: prefix,
      })
      .promise();

    const contents = data?.Contents || [];

    const sortedFiles = contents
      .sort((a, b) =>
        (a.LastModified?.getTime() ?? 0) -
        (b.LastModified?.getTime() ?? 0)
      )
      .map((file) => ({
        key: file.Key!,
        url: `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${file.Key}`,
        lastModified: file.LastModified,
      }));

    return NextResponse.json(sortedFiles);
  } catch (error) {
    console.error('Erro no GET /api/s3:', error);

    return NextResponse.json(
      { error: 'Erro ao listar arquivos do S3.' },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------
   DELETE  → Apagar arquivo do bucket
------------------------------------------------------ */
export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: 'Chave do arquivo não fornecida.' },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: 'O nome do bucket não está configurado.' },
        { status: 500 }
      );
    }

    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: key,
      })
      .promise();

    return NextResponse.json({ message: 'Imagem apagada com sucesso!' });
  } catch (error) {
    console.error('Erro ao apagar imagem:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao apagar imagem do S3.', details: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs',
};

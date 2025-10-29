import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; 

// 💡 Entfernen Sie die obersten Definitionen hier!

// Wir definieren den Client und die Konstanten NICHT auf oberster Ebene, 
// um das Timing-Problem zu umgehen.

/**
 * Generiert eine temporäre, signierte URL für ein privates S3-Objekt.
 * @param {string} key Der Dateipfad/Key im S3 Bucket.
 * @returns {Promise<string>} Die temporäre URL.
 */
export const getPresignedUrl = async (key) => {
    // 💡 HIER ist process.env garantiert geladen.
    const bucketName = process.env.S3_BUCKET_NAME;
    const awsRegion = process.env.AWS_REGION;

    if (!bucketName || !awsRegion) {
        throw new Error('S3_BUCKET_NAME oder AWS_REGION ist nicht verfügbar. Umgebungsvariablenfehler.');
    }
    
    // Client und Command müssen bei jeder Ausführung neu konfiguriert werden
    // (können aber auch einmal in einer "init" Funktion konfiguriert werden)
    const s3Client = new S3Client({ region: awsRegion }); 
    
    const command = new GetObjectCommand({
        Bucket: bucketName, 
        Key: key,
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); 
    return url;
};
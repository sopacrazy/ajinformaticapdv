const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_NAME = 'loja.db';
const BACKUP_TEMP = 'loja_backup_temp.db';
const REMOTE_NAME = 'meu_onedrive'; // Nome que você deu no rclone config
const REMOTE_FOLDER = 'Backups_PDV'; // Pasta que será criada no seu OneDrive

function realizarBackup() {
    console.log(`[${new Date().toLocaleString()}] Iniciando processo de backup...`);

    // 1. Cria uma cópia segura do SQLite (evita travar o banco em uso)
    // Usando sqlite3 CLI para gerar um backup quente (hot backup)
    const sqliteCommand = `sqlite3 ${DB_NAME} ".backup '${BACKUP_TEMP}'"`;

    exec(sqliteCommand, (err) => {
        if (err) {
            console.error("Erro ao gerar snapshot do SQLite:", err);
            console.log("Dica: Certifique-se de que o 'sqlite3' está instalado e no PATH do Windows.");
            return;
        }

        console.log("Snapshot gerado. Enviando para o OneDrive...");

        // 2. Usa o Rclone para subir o arquivo
        const rcloneCommand = `rclone copy ./${BACKUP_TEMP} ${REMOTE_NAME}:${REMOTE_FOLDER}`;

        exec(rcloneCommand, (err) => {
            if (err) {
                console.error("Erro ao enviar para o OneDrive:", err);
                console.log("Dica: Certifique-se de que o Rclone está configurado como 'meu_onedrive'.");
            } else {
                console.log("✅ Backup concluído com sucesso no OneDrive!");
            }

            // 3. Remove o arquivo temporário local
            if (fs.existsSync(BACKUP_TEMP)) {
                fs.unlinkSync(BACKUP_TEMP);
            }
        });
    });
}

// Executa o backup imediatamente ao rodar o script
realizarBackup();

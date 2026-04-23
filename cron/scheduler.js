const cron = require('node-cron');


function iniciarCronJobs(client) {
    console.log('[CRON] scheduler cargado');

    cron.schedule("13 23 * * * ", function () {
        console.log("[CRON] Ejecutando tarea diaria a las 23:00");
        const guildId = '1415028934801752086'; // Reemplaza con el ID de tu servidor
        const channelId = '1453416324029222965'; // Reemplaza con el ID de tu canal

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error(`[CRON] No se encontró el servidor con ID ${guildId}`);
            return;
        }
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            channel.send("¡Es hora de la fiesta diaria! 🎉");
        } else {
            console.error(`[CRON] No se encontró el canal con ID ${channelId}`);
        }
    });

    console.log('[CRON] tarea registrada:');
}

module.exports = { iniciarCronJobs };
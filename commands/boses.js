const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getConfigKey(interaction) {
    const gid = interaction.guildId ?? 'dm';
    return `${gid}`;
}

function buildRoleMentions(raw) {
    if (!raw) return { text: '', ids: [] };

    const ids = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => /^\d{17,20}$/.test(s)); // snowflake típico

    const text = ids.map(id => `<@&${id}>`).join(' ');
    return { text, ids };
}

// Día actual + hora configurada; si ya pasó, mañana (misma idea que tu generarFechaHoy)
function calcularBossTsParaHoyOMañana(horaTexto) {
    const [hhStr, mmStr] = (horaTexto || '21:00').split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);

    const now = new Date();
    const targetLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (targetLocal <= now) targetLocal.setDate(targetLocal.getDate() + 1);

    const nodeTs = Math.floor(targetLocal.getTime() / 1000);
    return {
        nodeTs,
        horarioTexto: `<t:${nodeTs}:F> (<t:${nodeTs}:t>)`,
        countdownTexto: `<t:${nodeTs}:R>`
    };
}

module.exports = {
    data: {
        name: 'boses',
        description: 'Muestra bosses (config por canal)'
    },

    async execute(interaction, configBoses, saveBoses, client) {
        const key = getConfigKey(interaction);

        const config = configBoses.get(key);

        const { nodeTs, horarioTexto, countdownTexto } = calcularBossTsParaHoyOMañana(config.hora);
        const { text: rolePingText, ids: roleIds } = buildRoleMentions(config.roles);

        const embed = new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('👹 ¡BOSES DE GREMIO HOY! 👹')
            .setDescription(`Preparate para los boses de gremios!`)
            .addFields(
                { name: '📅 Dia / Hora', value: `${horarioTexto}`, inline: false },
                {
                    name: '', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false
                },
                { name: '⏰ Comienzan en', value: `${countdownTexto}`, inline: true },
                { name: '📌 Server', value: config.server || '-', inline: true },
                { name: '🔁 Rotación', value: `\`\`\`${config.rotacion || '-'}\`\`\``, inline: false },
                { name: '', value: `**${config.comentario || '-'}**`, inline: false }
            )
            .setImage('https://s1.pearlcdn.com/KR/Upload/News/b3ff0a8ddf820260102135811899.jpg');

        await interaction.reply({
            content: rolePingText || undefined,
            embeds: [embed],
            allowedMentions: { roles: roleIds } // controla qué roles realmente se pinguean
        });
    },
};

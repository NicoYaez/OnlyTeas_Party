const {
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    MessageFlags
} = require('discord.js');

function getConfigKey(interaction) {
    const gid = interaction.guildId ?? 'dm';
    return `${gid}`;
}

module.exports = {
    data: {
        name: 'config-boses',
        description: 'Configurar bosses (por canal)',
        dmPermission: false
    },

    async execute(interaction, configBoses, saveBoses, client) {
        const key = getConfigKey(interaction);

        const config = configBoses.get(key) || {
            hora: '21:00',
            comentario: '¡Prepárate para los bosses!',
            rotacion: '',
            server: '',
            roles: ''
        };

        const horaDefault = (typeof config.hora === 'string' && config.hora) ? config.hora : '21:00';

        const modal = new ModalBuilder()
            .setCustomId('boses_config_modal')
            .setTitle('🔧 Configurar Bosses')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('hora')
                        .setLabel('Hora (HH:mm)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ej: 21:00')
                        .setValue(horaDefault)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('rotacion')
                        .setLabel('Rotación')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(80)
                        .setValue(config.rotacion || '')
                        .setPlaceholder('Ej: Kutum > Nouver > Karanda')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('server')
                        .setLabel('Server')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(60)
                        .setValue(config.server || '')
                        .setPlaceholder('Ej: Valencia 2 / Arsha / Season 1')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('comentario')
                        .setLabel('Comentario')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(500)
                        .setValue(config.comentario || '')
                        .setPlaceholder('Lleguen 10 min antes.')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('roles')
                        .setLabel('Roles a pingear (IDs, separados por ,)')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(400)
                        .setValue(config.roles || '')
                        .setPlaceholder('Ej: 123...,456... (o vacío para ninguno)')
                ),
            );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction, configBoses, saveBoses, client) {
        // Nota: mantengo tu estilo: `interaction.isModalSubmit && ...`
        if (interaction.isModalSubmit && interaction.customId === 'boses_config_modal') {
            const key = getConfigKey(interaction);

            const horaInput = interaction.fields.getTextInputValue('hora');
            const rotacion = interaction.fields.getTextInputValue('rotacion') || '';
            const server = interaction.fields.getTextInputValue('server') || '';
            const comentario = interaction.fields.getTextInputValue('comentario') || '';
            const rolesRaw = interaction.fields.getTextInputValue('roles') || '';

            // Validar HH:mm
            let horaGuardada;
            try {
                const [hh, min] = (horaInput || '').split(':');
                if (!hh || !min || hh.length !== 2 || min.length !== 2) throw new Error('Hora inválida');
                const hhn = Number(hh), minn = Number(min);
                if (Number.isNaN(hhn) || Number.isNaN(minn) || hhn > 23 || minn > 59) throw new Error('Hora inválida');
                horaGuardada = `${hh.padStart(2, '0')}:${min.padStart(2, '0')}`;
            } catch {
                await interaction.reply({
                    content: '❌ Formato de hora inválido. Usa HH:mm (Ej: 21:00)',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            configBoses.set(key, { hora: horaGuardada, comentario, rotacion, server, roles: rolesRaw });
            saveBoses();

            await interaction.reply({
                content:
                    `✅ Config guardada para este canal.\n` +
                    `⏰ Hora: **${horaGuardada}**\n` +
                    `🔁 Rotación: **${rotacion || '-'}**\n` +
                    `🖥️ Server: **${server || '-'}**\n` +
                    `💬 Comentario: "${comentario || '-'}"`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
    }
};

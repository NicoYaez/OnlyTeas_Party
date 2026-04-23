const {
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    MessageFlags
} = require('discord.js');

function getConfigKey(interaction) {
    const gid = interaction.guildId ?? 'dm';
    return `${gid}`;
}

function parseRoleIds(raw) {
    // Acepta: "123,456" o "<@&123>, <@&456>" o separados por espacios/nuevas líneas
    const ids = String(raw || '')
        .split(/[, \n]+/g)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/[<@&>]/g, ''))
        .filter(s => /^\d{17,20}$/.test(s));

    return [...new Set(ids)];
}

module.exports = {
    data: {
        name: 'config-party',
        description: 'Configurar roles a pingear al crear una party (por servidor)',
        dmPermission: false
    },

    async execute(interaction, configParty, savePartyConfig, client) {
        const key = getConfigKey(interaction);

        const cfg = configParty.get(key) || {
            roles: ''
        };

        const modal = new ModalBuilder()
            .setCustomId('party_config_modal')
            .setTitle('🔧 Configurar Party')
            .addComponents(
                // En modals: 1 TextInput por ActionRow, máximo 5 rows [page:0]
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('roles')
                        .setLabel('Roles a pingear (IDs, separados por ,)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(800)
                        .setValue(cfg.roles || '')
                        .setPlaceholder('Ej: 123...,456... (o vacío para ninguno)')
                        .setRequired(false)
                ),
            );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction, configParty, savePartyConfig, client) {
        // Mantengo tu estilo: interaction.isModalSubmit && ...
        if (interaction.isModalSubmit && interaction.customId === 'party_config_modal') {
            const key = getConfigKey(interaction);

            const rolesRaw = interaction.fields.getTextInputValue('roles') || '';
            const roleIds = parseRoleIds(rolesRaw);

            // (Opcional) valida existencia en el server
            const missing = roleIds.filter(id => !interaction.guild?.roles?.cache?.has(id));

            configParty.set(key, {
                roles: roleIds.join(','),
            });
            savePartyConfig();

            const preview = roleIds.length
                ? roleIds.map(id => `<@&${id}>`).join(' ') // mention rol por ID [page:1]
                : '(ninguno)';

            await interaction.reply({
                content:
                    `✅ Config guardada para este servidor.\n` +
                    `Roles: ${preview}\n` +
                    (missing.length ? `⚠️ No encontrados en este server: ${missing.join(', ')}` : ''),
                flags: MessageFlags.Ephemeral
            });
            return;
        }
    }
};

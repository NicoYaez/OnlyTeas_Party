// commands/anuncio.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Crear un anuncio'),

    // execute: sólo muestra el modal
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('anuncio_modal')
            .setTitle('Crear anuncio');

        const tituloInput = new TextInputBuilder()
            .setCustomId('anuncio_titulo')
            .setLabel('Título del anuncio')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descripcionInput = new TextInputBuilder()
            .setCustomId('anuncio_descripcion')
            .setLabel('Descripción')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const imagenInput = new TextInputBuilder()
            .setCustomId('anuncio_imagen')
            .setLabel('URL de la imagen (opcional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('https://...');

        const rolInput = new TextInputBuilder()
            .setCustomId('anuncio_rol')
            .setLabel('ID del rol a mencionar (opcional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Ej: 123456789012345678');

        modal.addComponents(
            new ActionRowBuilder().addComponents(tituloInput),
            new ActionRowBuilder().addComponents(descripcionInput),
            new ActionRowBuilder().addComponents(imagenInput),
            new ActionRowBuilder().addComponents(rolInput),
        );

        await interaction.showModal(modal);
    },

    // handleInteraction: maneja el submit del modal
    async handleInteraction(interaction) {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId !== 'anuncio_modal') return;

        const titulo = interaction.fields.getTextInputValue('anuncio_titulo');
        const descripcion = interaction.fields.getTextInputValue('anuncio_descripcion');
        const imagen = interaction.fields.getTextInputValue('anuncio_imagen')?.trim();
        const rolId = interaction.fields.getTextInputValue('anuncio_rol')?.trim();

        const color = 0x8B4DDE;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: 'Anuncio', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(titulo)
            .setDescription(descripcion)
            .setFooter({ text: `Publicado por ${interaction.user.username}` })
            .setTimestamp();

        if (imagen) {
            embed.setImage(imagen);
        }

        let content = '';
        let allowedMentions = { parse: [] };

        if (rolId) {
            content = `<@&${rolId}>`;
            allowedMentions = { roles: [rolId] }; // solo ese rol se pinguea
        }

        await interaction.reply({
            content: content || undefined,
            embeds: [embed],
            allowedMentions,
            flags: MessageFlags.None
        });
    }
};

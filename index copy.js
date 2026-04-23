
const {
    Client, GatewayIntentBits, Partials,
    EmbedBuilder, Events, ActivityType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

client.once(Events.ClientReady, () => {
    console.log('Bot listo');
    client.user.setActivity('Black Desert Online', { type: ActivityType.Playing });
});

/* =======================
   /cupon
   ======================= */
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'cupon') {
        const codigo = interaction.options.getString('codigo');
        const color = 0x8B4DDE;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: 'Cupón disponible', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('🎟️ Código promocional')
            .setDescription('Reacciona para indicar si lo usaste, si no funciona o si te fue indiferente.')
            .addFields({ name: 'Código', value: `\`\`\`\n${codigo}\n\`\`\``, inline: false })
            .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430403961927634974/Images.webp?ex=68f9a700&is=68f85580&hm=b4b3dcb2b06b9be6d85764700208eb99e2ff270e71ce44fe23dcbc5fb3af12d9&')
            .setFooter({ text: `Publicado por ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        const mensaje = await interaction.fetchReply().catch(() => null);
        if (mensaje) {
            await mensaje.react('✅').catch(() => { });
            await mensaje.react('🚫').catch(() => { });
            await mensaje.react('🙂').catch(() => { });
        }
    }
});

/* =======================
   /party con Editar + Agregar + Cerrar
   ======================= */
const gruposActivos = new Map(); // messageId -> grupo

// Helpers de resolución
function getPartyIdFromCustomId(customId, prefixes) {
    if (!customId) return null;
    for (const p of prefixes) {
        if (customId.startsWith(p + ':')) return customId.slice(p.length + 1);
    }
    return null;
}

function resolveGrupoFromInteraction(interaction) {
    // 1) customId con formato prefix:mensajeId (solo party_add_select)
    const idFromCustom = getPartyIdFromCustomId(interaction.customId, ['party_add_select']);
    if (idFromCustom && gruposActivos.has(idFromCustom)) return gruposActivos.get(idFromCustom);

    // 2) message.id del mensaje público
    const mid = interaction.message?.id;
    if (mid && gruposActivos.has(mid)) return gruposActivos.get(mid);

    // 3) modal: party_modal_<mensajeId>
    if (interaction.isModalSubmit?.()) {
        const parts = (interaction.customId || '').split('_');
        const pid = parts[2];
        if (pid && gruposActivos.has(pid)) return gruposActivos.get(pid);
    }
    return null;
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isModalSubmit() && !(interaction.isUserSelectMenu?.())) return;

    // Crear party
    if (interaction.isChatInputCommand() && interaction.commandName === 'party') {
        const motivo = interaction.options.getString('motivo');
        const descripcion = interaction.options.getString('descripcion') ?? '-';
        const tamano = Math.max(1, Math.min(10, interaction.options.getInteger('tamano') ?? 5));
        const color = 0x8B4DDE;
        const creador = interaction.user;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: `Grupo creado por ${creador.username}`, iconURL: creador.displayAvatarURL() })
            .setTitle(`⚔️ ¡Nuevo grupo: ${motivo}!`)
            .setDescription('Únete con el botón verde o sal con el rojo.')
            .addFields(
                { name: 'Descripción', value: `\`\`\`\n${descripcion}\n\`\`\``, inline: false },
                { name: `Miembros (0/${tamano})`, value: '—\nAún no hay inscritos.\n—', inline: false }
            )
            .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png?ex=68f9a7ac&is=68f8562c&hm=f4fae4e11af7745c4041f64aea47c48307058a435e10373c19017ddf9f9a967d&')
            .setFooter({ text: `Cupos: 0/${tamano}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success);
        const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
        const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const closeBtn = new ButtonBuilder().setCustomId('party_close').setLabel('Cerrar Party').setStyle(ButtonStyle.Danger);

        const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
        const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, closeBtn);

        await interaction.reply({ embeds: [embed], components: [rowMain, rowManage] });
        const mensaje = await interaction.fetchReply();

        gruposActivos.set(mensaje.id, {
            miembros: [],
            motivo,
            descripcion,
            creador,
            mensajeId: mensaje.id,
            color,
            max: tamano
        });
        return;
    }

    // Resolver grupo en todos los flujos
    let grupo = resolveGrupoFromInteraction(interaction);
    if (!grupo) {
        try { if (interaction.isRepliable()) await interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }); } catch { }
        return;
    }
    const isOwner = interaction.user.id === grupo.creador.id;

    // Botones
    if (interaction.isButton()) {
        const user = interaction.user;

        if (interaction.customId === 'party_join') {
            if (grupo.miembros.some(u => u.id === user.id)) {
                return interaction.reply({ content: 'Ya estás en la party.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            if (grupo.miembros.length >= grupo.max) {
                return interaction.reply({ content: 'El grupo ya está completo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            grupo.miembros.push({ id: user.id, tag: user.username });
            await renderGrupo(interaction, grupo, `${user.username} se unió al grupo.`);
            return;
        }

        if (interaction.customId === 'party_leave') {
            if (!grupo.miembros.some(u => u.id === user.id)) {
                return interaction.reply({ content: 'No formas parte de este grupo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);
            await renderGrupo(interaction, grupo, `${user.username} salió del grupo.`);
            return;
        }

        if (interaction.customId === 'party_edit') {
            if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            const modal = new ModalBuilder()
                .setCustomId(`party_modal_${grupo.mensajeId}`)
                .setTitle('Editar party')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Short).setMaxLength(100).setValue(grupo.motivo)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('descripcion').setLabel('Descripción').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(grupo.descripcion)
                    )
                );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'party_add') {
            if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            if (espacio === 0) {
                return interaction.reply({ content: 'No hay cupos disponibles.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId(`party_add_select:${grupo.mensajeId}`) // embebe mensajeId
                .setPlaceholder('Selecciona usuarios para agregar')
                .setMinValues(1)
                .setMaxValues(Math.min(espacio, 10));
            const row = new ActionRowBuilder().addComponents(userSelect);
            return interaction.reply({ content: 'Elige usuarios para agregar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        if (interaction.customId === 'party_close') {
            if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            const disabledRowMain = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger).setDisabled(true)
            );
            const disabledRowManage = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('party_add').setLabel('Agregar').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('party_close').setLabel('Cerrar Party').setStyle(ButtonStyle.Danger).setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledRowMain, disabledRowManage] }).catch(() => { });
            gruposActivos.delete(grupo.mensajeId);
            return interaction.reply({ content: 'Party cerrada.', flags: MessageFlags.Ephemeral }).catch(() => { });
        }
    }

    // UserSelect: agregar miembros (efímero)
    if (interaction.isUserSelectMenu?.() && interaction.customId.startsWith('party_add_select:')) {
        const partyMsgId = interaction.customId.split(':')[1];
        grupo = gruposActivos.get(partyMsgId);
        if (!grupo) return interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
        if (interaction.user.id !== grupo.creador.id) {
            return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const espacio = Math.max(0, grupo.max - grupo.miembros.length);
        if (espacio === 0) {
            return interaction.update({ components: [] }).catch(() => { });
        }

        const ids = interaction.values ?? [];
        const nuevos = ids.filter(id => !grupo.miembros.some(m => m.id === id)).slice(0, espacio);
        for (const id of nuevos) {
            const member = interaction.guild?.members?.cache?.get(id);
            const tag = member?.user?.username ?? id;
            grupo.miembros.push({ id, tag });
        }

        await interaction.update({ components: [] }).catch(() => { });
        await renderGrupoFromMessageId(interaction, grupo).catch(() => { });
        await interaction.followUp({ content: `Agregados ${nuevos.length} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
        return;
    }

    // Modal submit (editar)
    if (interaction.isModalSubmit()) {
        if (interaction.customId === `party_modal_${grupo.mensajeId}`) {
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            const nuevoMotivo = (interaction.fields.getTextInputValue('motivo') ?? '').slice(0, 100) || grupo.motivo;
            const nuevaDesc = (interaction.fields.getTextInputValue('descripcion') ?? '').slice(0, 1000) || grupo.descripcion;
            grupo.motivo = nuevoMotivo;
            grupo.descripcion = nuevaDesc;

            await interaction.reply({ content: 'Party actualizada.', flags: MessageFlags.Ephemeral }).catch(() => { });
            await renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            return;
        }
    }
});

/* =======================
   Helpers
   ======================= */
async function renderGrupo(interaction, grupo, msgEphemeral) {
    const inscritos = grupo.miembros.length;
    const lista = inscritos
        ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
        : '—\nAún no hay inscritos.\n—';

    const embed = new EmbedBuilder()
        .setColor(grupo.color)
        .setAuthor({ name: `Grupo creado por ${grupo.creador.username}`, iconURL: grupo.creador.displayAvatarURL() })
        .setTitle(`⚔️ ¡Nuevo grupo: ${grupo.motivo}!`)
        .setDescription('Únete con el botón verde o sal con el rojo.')
        .addFields(
            { name: 'Descripción', value: `\`\`\`\n${grupo.descripcion}\n\`\`\``, inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        )
        .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png?ex=68f9a7ac&is=68f8562c&hm=f4fae4e11af7745c4041f64aea47c48307058a435e10373c19017ddf9f9a967d&')
        .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
        .setTimestamp();

    const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
    const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
    const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
    const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
    const closeBtn = new ButtonBuilder().setCustomId('party_close').setLabel('Cerrar Party').setStyle(ButtonStyle.Danger);

    const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
    const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, closeBtn);

    await interaction.message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });
    if (msgEphemeral) {
        try {
            if (interaction.replied || interaction.deferred) await interaction.followUp({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
            else await interaction.reply({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
        } catch { }
    }
}

async function renderGrupoFromMessageId(interaction, grupo) {
    const channel = interaction.channel;
    if (!channel) return;
    const message = await channel.messages.fetch(grupo.mensajeId).catch(() => null);
    if (!message) return;

    const inscritos = grupo.miembros.length;
    const lista = inscritos
        ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
        : '—\nAún no hay inscritos.\n—';

    const embed = new EmbedBuilder()
        .setColor(grupo.color)
        .setAuthor({ name: `Grupo creado por ${grupo.creador.username}`, iconURL: grupo.creador.displayAvatarURL() })
        .setTitle(`⚔️ ¡Nuevo grupo: ${grupo.motivo}!`)
        .setDescription('Únete con el botón verde o sal con el rojo.')
        .addFields(
            { name: 'Descripción', value: `\`\`\`\n${grupo.descripcion}\n\`\`\``, inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        )
        .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png?ex=68f9a7ac&is=68f8562c&hm=f4fae4e11af7745c4041f64aea47c48307058a435e10373c19017ddf9f9a967d&')
        .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
        .setTimestamp();

    const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
    const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
    const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
    const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
    const closeBtn = new ButtonBuilder().setCustomId('party_close').setLabel('Cerrar Party').setStyle(ButtonStyle.Danger);

    const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
    const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, closeBtn);

    await message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });
}

/* =======================
   Login
   ======================= */

client.login('MTQzMDI3NTc3MTI0NjcxMDkxNQ.G8z5Xr.c1LSYVEMD7Mu3CbHArOwDV1oWthfJnpcujuVpA');

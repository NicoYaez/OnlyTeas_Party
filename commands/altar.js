const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

const ALTAR_PREFIX = 'altar';
const ALTAR_IMAGE = 'https://s1.pearlcdn.com/KR/Upload/News/6dfb357af7d20260403151304272.png';

module.exports = {
    data: {
        name: 'altar',
        description: 'Crear party Altar de Sangre',
    },

    async execute(interaction, gruposAltar, saveAltar, client) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const nowText = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

        const modal = new ModalBuilder()
            .setCustomId(`${ALTAR_PREFIX}_create_modal`)
            .setTitle('Crear Party (Altar de Sangre)')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('hora')
                        .setLabel('Hora (YYYY-MM-DD HH:mm)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ej: 2026-01-12 21:00')
                        .setValue(nowText)
                        .setRequired(true)
                )
            );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction, gruposAltar, saveAltar, client) {
        function parseLocalYYYYMMDDHHmm(input) {
            const m = String(input || '').trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
            if (!m) return null;

            const year = Number(m[1]);
            const month = Number(m[2]);
            const day = Number(m[3]);
            const hour = Number(m[4]);
            const minute = Number(m[5]);

            const d = new Date(year, month - 1, day, hour, minute, 0, 0);
            if (Number.isNaN(d.getTime())) return null;
            return d;
        }

        function getPartyIdFromCustomId(customId, prefixes) {
            if (!customId) return null;
            for (const p of prefixes) {
                if (customId.startsWith(p + ':')) return customId.slice(p.length + 1);
            }
            return null;
        }

        function resolveGrupoFromInteraction(interaction) {
            const idFromCustom = getPartyIdFromCustomId(interaction.customId, [
                `${ALTAR_PREFIX}_add_select`,
                `${ALTAR_PREFIX}_kick_select`
            ]);
            if (idFromCustom && gruposAltar.has(idFromCustom)) return gruposAltar.get(idFromCustom);

            const mid = interaction.message?.id;
            if (mid && gruposAltar.has(mid)) return gruposAltar.get(mid);

            if (interaction.isModalSubmit?.()) {
                const parts = (interaction.customId || '').split('_');
                const pid = parts[2];
                if (pid && gruposAltar.has(pid)) return gruposAltar.get(pid);
            }
            return null;
        }

        // ------- CREAR PARTY DESDE MODAL -------
        if (interaction.isModalSubmit() && interaction.customId === `${ALTAR_PREFIX}_create_modal`) {
            const motivo = 'Altar de Sangre';
            const horaRaw = interaction.fields.getTextInputValue('hora');

            const tamano = 3;
            const color = 0x8B0000;
            const creador = interaction.user;

            const fechaParty = parseLocalYYYYMMDDHHmm(horaRaw);
            if (!fechaParty) {
                await interaction.reply({
                    content: 'Formato de fecha/hora inválido. Usa YYYY-MM-DD HH:mm',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const timestamp = Math.floor(fechaParty.getTime() / 1000);

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `Grupo creado por ${creador.username}`, iconURL: creador.displayAvatarURL() })
                .setTitle(`🩸 ¡Nuevo grupo: ${motivo}!`)
                .setDescription('Únete con el botón verde o sal con el rojo.')
                .addFields(
                    { name: 'Zona', value: '```Altar de Sangre```', inline: false },
                    { name: 'Horario', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
                    { name: '\u200B', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
                    { name: `Miembros (0/${tamano})`, value: '—\nAún no hay inscritos.\n—', inline: false },
                )
                .setImage(ALTAR_IMAGE)
                .setFooter({ text: `Cupos: 0/${tamano}` })
                .setTimestamp();

            const joinBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_join`).setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success);
            const leaveBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_leave`).setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
            const editBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_edit`).setLabel('Editar').setStyle(ButtonStyle.Secondary);
            const addBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_add`).setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
            const kickBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_kick`).setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

            const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
            const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

            await interaction.reply({ embeds: [embed], components: [rowMain, rowManage] });
            const mensaje = await interaction.fetchReply();

            gruposAltar.set(mensaje.id, {
                miembros: [],
                motivo,
                creador,
                mensajeId: mensaje.id,
                color,
                max: tamano,
                hora: timestamp
            });

            saveAltar();
            return;
        }

        let grupo = resolveGrupoFromInteraction(interaction);
        if (!grupo) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: 'Este grupo ya no está activo.',
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
            return;
        }

        const isOwner = interaction.user.id === grupo.creador.id;

        if (interaction.isButton()) {
            const user = interaction.user;

            if (interaction.customId === `${ALTAR_PREFIX}_join`) {
                if (grupo.miembros.some(u => u.id === user.id)) {
                    return interaction.reply({ content: 'Ya estás en la party.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }
                if (grupo.miembros.length >= grupo.max) {
                    return interaction.reply({ content: 'El grupo ya está completo.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                grupo.miembros.push({ id: user.id, tag: user.username });
                saveAltar();
                await this.renderGrupo(interaction, grupo, `${user.username} se unió al grupo.`);
                return;
            }

            if (interaction.customId === `${ALTAR_PREFIX}_leave`) {
                if (!grupo.miembros.some(u => u.id === user.id)) {
                    return interaction.reply({ content: 'No formas parte de este grupo.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);
                saveAltar();
                await this.renderGrupo(interaction, grupo, `${user.username} salió del grupo.`);
                return;
            }

            if (interaction.customId === `${ALTAR_PREFIX}_edit`) {
                if (!isOwner) {
                    return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                let horaTexto = '';
                if (grupo.hora) {
                    const d = new Date(grupo.hora * 1000);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    horaTexto = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
                }

                const modal = new ModalBuilder()
                    .setCustomId(`${ALTAR_PREFIX}_modal_${grupo.mensajeId}`)
                    .setTitle('Editar party (Altar de Sangre)')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('hora')
                                .setLabel('Hora (YYYY-MM-DD HH:mm)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Ej: 2026-01-12 21:00')
                                .setValue(horaTexto || '')
                                .setRequired(false)
                        )
                    );

                return interaction.showModal(modal);
            }

            if (interaction.customId === `${ALTAR_PREFIX}_add`) {
                if (!isOwner) {
                    return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const espacio = Math.max(0, grupo.max - grupo.miembros.length);
                if (espacio === 0) {
                    return interaction.reply({ content: 'No hay cupos disponibles.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`${ALTAR_PREFIX}_add_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para agregar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({
                    content: 'Elige usuarios para agregar:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }

            if (interaction.customId === `${ALTAR_PREFIX}_kick`) {
                if (!isOwner) {
                    return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                if (grupo.miembros.length === 0) {
                    return interaction.reply({ content: 'No hay miembros para sacar.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`${ALTAR_PREFIX}_kick_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para sacar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(grupo.miembros.length, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({
                    content: 'Elige usuarios para sacar:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }

        if (interaction.isUserSelectMenu() && interaction.customId.startsWith(`${ALTAR_PREFIX}_add_select:`)) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposAltar.get(partyMsgId);

            if (!grupo) return interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            if (espacio === 0) return interaction.update({ components: [] }).catch(() => { });

            const ids = interaction.values ?? [];
            const nuevos = ids.filter(id => !grupo.miembros.some(m => m.id === id)).slice(0, espacio);

            for (const id of nuevos) {
                const member = interaction.guild?.members?.cache?.get(id);
                const tag = member?.user?.username ?? id;
                grupo.miembros.push({ id, tag });
            }

            saveAltar();
            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Agregados ${nuevos.length} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        if (interaction.isUserSelectMenu() && interaction.customId.startsWith(`${ALTAR_PREFIX}_kick_select:`)) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposAltar.get(partyMsgId);

            if (!grupo) return interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            const ids = interaction.values ?? [];
            const antes = grupo.miembros.length;

            grupo.miembros = grupo.miembros.filter(m => !ids.includes(m.id));
            const removidos = antes - grupo.miembros.length;

            saveAltar();
            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Sacados ${removidos} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === `${ALTAR_PREFIX}_modal_${grupo.mensajeId}`) {
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            const horaRaw = (interaction.fields.getTextInputValue('hora') ?? '').trim();
            if (horaRaw) {
                const d = parseLocalYYYYMMDDHHmm(horaRaw);
                if (!d) {
                    return interaction.reply({
                        content: 'Formato de fecha/hora inválido. Usa YYYY-MM-DD HH:mm (ej: 2026-01-12 21:00)',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }
                grupo.hora = Math.floor(d.getTime() / 1000);
            }

            grupo.motivo = 'Altar de Sangre';
            grupo.max = 3;

            saveAltar();

            await interaction.reply({ content: 'Party actualizada.', flags: MessageFlags.Ephemeral }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            return;
        }
    },

    async renderGrupo(interaction, grupo, msgEphemeral) {
        const inscritos = grupo.miembros.length;
        const lista = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '—\nAún no hay inscritos.\n—';

        let autorNombre = grupo.creador.username || 'Desconocido';
        let autorIcon = null;

        try {
            let userObj = null;
            if (interaction.guild) {
                userObj = await interaction.guild.members.fetch(grupo.creador.id)
                    .then(m => m.user)
                    .catch(() => null);
            }
            if (!userObj && interaction.client) {
                userObj = await interaction.client.users.fetch(grupo.creador.id).catch(() => null);
            }
            if (userObj) autorIcon = userObj.displayAvatarURL();
        } catch { }

        const horarioField = grupo.hora
            ? { name: 'Horario', value: `<t:${grupo.hora}:F> (<t:${grupo.hora}:R>)`, inline: false }
            : null;

        const fields = [
            { name: 'Zona', value: '```Altar de Sangre```', inline: false },
            ...(horarioField ? [horarioField] : []),
            { name: '\u200B', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        ];

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setAuthor({ name: `Grupo creado por ${autorNombre}`, iconURL: autorIcon || undefined })
            .setTitle(`🩸 ¡Nuevo grupo: ${grupo.motivo}!`)
            .setDescription('Únete con el botón verde o sal con el rojo.')
            .addFields(fields)
            .setImage(ALTAR_IMAGE)
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder()
            .setCustomId(`${ALTAR_PREFIX}_join`)
            .setLabel('Unirme')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Success)
            .setDisabled(inscritos >= grupo.max);

        const leaveBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_leave`).setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const editBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_edit`).setLabel('Editar').setStyle(ButtonStyle.Secondary);
        const addBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_add`).setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
        const kickBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_kick`).setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

        const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
        const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

        await interaction.message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });

        if (msgEphemeral) {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
                }
            } catch { }
        }
    },

    async renderGrupoFromMessageId(interaction, grupo) {
        const channel = interaction.channel;
        if (!channel) return;

        const message = await channel.messages.fetch(grupo.mensajeId).catch(() => null);
        if (!message) return;

        const inscritos = grupo.miembros.length;
        const lista = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '—\nAún no hay inscritos.\n—';

        let autorNombre = grupo.creador.username || 'Desconocido';
        let autorIcon = null;

        try {
            let userObj = null;
            if (interaction.guild) {
                userObj = await interaction.guild.members.fetch(grupo.creador.id)
                    .then(m => m.user)
                    .catch(() => null);
            }
            if (!userObj && interaction.client) {
                userObj = await interaction.client.users.fetch(grupo.creador.id).catch(() => null);
            }
            if (userObj) autorIcon = userObj.displayAvatarURL();
        } catch { }

        const horarioField = grupo.hora
            ? { name: 'Horario', value: `<t:${grupo.hora}:F> (<t:${grupo.hora}:R>)`, inline: false }
            : null;

        const fields = [
            { name: 'Zona', value: '```Altar de Sangre```', inline: false },
            ...(horarioField ? [horarioField] : []),
            { name: '\u200B', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        ];

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setAuthor({ name: `Grupo creado por ${autorNombre}`, iconURL: autorIcon || undefined })
            .setTitle(`🩸 ¡Nuevo grupo: ${grupo.motivo}!`)
            .setDescription('Únete con el botón verde o sal con el rojo.')
            .addFields(fields)
            .setImage(ALTAR_IMAGE)
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder()
            .setCustomId(`${ALTAR_PREFIX}_join`)
            .setLabel('Unirme')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Success)
            .setDisabled(inscritos >= grupo.max);

        const leaveBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_leave`).setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const editBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_edit`).setLabel('Editar').setStyle(ButtonStyle.Secondary);
        const addBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_add`).setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
        const kickBtn = new ButtonBuilder().setCustomId(`${ALTAR_PREFIX}_kick`).setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

        const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
        const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

        await message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });
    }
};
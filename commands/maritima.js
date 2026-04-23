const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

module.exports = {
    data: {
        name: 'maritima',
        description: 'Crear y manejar un escuadron maritimo BDO',
        options: [{
            name: 'dia',
            type: 3,
            description: 'Dia de la node (sin sabado)',
            required: true,
            choices: [
                { name: 'Domingo', value: '0' },
                { name: 'Lunes', value: '1' },
                { name: 'Martes', value: '2' },
                { name: 'Miercoles', value: '3' },
                { name: 'Jueves', value: '4' },
                { name: 'Viernes', value: '5' }
            ]
        }],
    },

    async execute(interaction, gruposActivos, savePartys, client) {
        const motivo = 'Node Maritima';
        const diaStr = interaction.options.getString('dia');

        const tamano = 25;

        const MAX_GALEON = 7;
        const MAX_RESERVA_CANONERO = 5;
        const MAX_RESERVA_BARCO = 5;
        const MAX_PROPIO = 12;

        const color = 0x3498db;
        const creador = interaction.user;

        const diasTexto = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const targetDow = parseInt(diaStr, 10);
        const diaNombre = diasTexto[targetDow] ?? 'Dia';

        const now = new Date();
        const dowNow = now.getDay();
        let diff = (targetDow - dowNow + 7) % 7;

        if (diff === 0 && now.getHours() >= 20) diff = 7;

        const targetLocal = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + diff,
            20, 0, 0, 0
        );

        const nodeTs = Math.floor(targetLocal.getTime() / 1000);

        const horarioTexto = `<t:${nodeTs}:F> (<t:${nodeTs}:t>)`;
        const countdownTexto = `<t:${nodeTs}:R>`;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⚓ NODE MARITIMA ⚓')
            .setDescription([
                'Prepárate para zarpar en la node maritima.',
                'Usa el botón **verde** para unirte y luego elige tu rol/barco.'
            ].join('\n'))
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                { name: '📌 Server', value: "O'dyllita-1", inline: false },
                { name: '🛟 Capitán (0)', value: '— Sin asignar —', inline: false },
                { name: `Galeon de Gremio (0/${MAX_GALEON})`, value: '— Sin asignar —', inline: false },
                { name: `Cañonero de reserva (0/${MAX_RESERVA_CANONERO})`, value: '— Sin asignar —', inline: false },
                { name: `⚓ Barco propio (0/${MAX_PROPIO})`, value: '— Sin asignar —', inline: false },
                { name: `Barco de reserva (0/${MAX_RESERVA_BARCO})`, value: '— Sin asignar —', inline: false },
                { name: '👤 Sin rol (0)', value: '—', inline: false }
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1453422810599784448/e5807e96e8620251114102528756.png?ex=694d64f9&is=694c1379&hm=fd39a4ce025893e99d6a2c5282f6996d2d53b9ef57f47d46013ffa2d5df0d971&')
            .setImage('https://s1.pearlcdn.com/NAEU/Upload/News/4343e5ba0d820240110090134694.png')
            .setFooter({ text: `Cupos disponibles: 0/${tamano}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder()
            .setCustomId('maritima_join')
            .setLabel('Unirme')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Success);

        const leaveBtn = new ButtonBuilder()
            .setCustomId('maritima_leave')
            .setLabel('Salir')
            .setEmoji('🚫')
            .setStyle(ButtonStyle.Danger);

        const galeonBtn = new ButtonBuilder()
            .setCustomId('maritima_set_galeon')
            .setLabel('🚢 Galeon de Gremio')
            .setStyle(ButtonStyle.Primary);

        const canoneroReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_canonero')
            .setLabel('💣 Cañonero de reserva')
            .setStyle(ButtonStyle.Secondary);

        const barcoReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_barco')
            .setLabel('🛟 Barco de reserva')
            .setStyle(ButtonStyle.Secondary);

        const propioBtn = new ButtonBuilder()
            .setCustomId('maritima_set_propio')
            .setLabel('⚓ Barco propio')
            .setStyle(ButtonStyle.Primary);

        const capitanBtn = new ButtonBuilder()
            .setCustomId('maritima_set_capitan')
            .setLabel('🚢🛟 Capitán')
            .setStyle(ButtonStyle.Secondary);

        const addBtn = new ButtonBuilder()
            .setCustomId('maritima_add')
            .setLabel('Agregar')
            .setStyle(ButtonStyle.Primary);

        const removeBtn = new ButtonBuilder()
            .setCustomId('maritima_remove')
            .setLabel('Eliminar')
            .setStyle(ButtonStyle.Danger);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn);
        const rowBottom = new ActionRowBuilder().addComponents(galeonBtn, canoneroReservaBtn, propioBtn, barcoReservaBtn, capitanBtn);

        await interaction.reply({ embeds: [embed], components: [rowTop, rowBottom] });
        const mensaje = await interaction.fetchReply();

        gruposActivos.set(mensaje.id, {
            miembros: [],
            motivo,
            dia: targetDow,
            diaNombre,
            nodeTs,
            creador,
            admins: ['527326979209560074', '291312809642295298'],
            mensajeId: mensaje.id,
            color,
            max: tamano,
            maxGaleon: MAX_GALEON,
            maxReservaCanonero: MAX_RESERVA_CANONERO,
            maxReservaBarco: MAX_RESERVA_BARCO,
            maxPropio: MAX_PROPIO,
        });
        savePartys();
    },

    async handleInteraction(interaction, gruposActivos, savePartys, client) {
        const customId = interaction.customId || '';

        function getPartyIdFromCustomId(id, prefixes) {
            if (!id) return null;
            for (const p of prefixes) {
                if (id.startsWith(p + ':')) return id.slice(p.length + 1);
            }
            return null;
        }

        function resolveGrupoFromInteraction(interaction) {
            const idFromCustom = getPartyIdFromCustomId(interaction.customId, ['maritima_add_select', 'maritima_remove_select']);
            if (idFromCustom && gruposActivos.has(idFromCustom)) return gruposActivos.get(idFromCustom);
            const mid = interaction.message?.id;
            if (mid && gruposActivos.has(mid)) return gruposActivos.get(mid);
            return null;
        }

        let grupo = resolveGrupoFromInteraction(interaction);
        if (!grupo) {
            if (interaction.isRepliable())
                await interaction.reply({ content: 'Este escuadron ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        const isOwner = interaction.user.id === grupo.creador.id || (grupo.admins && grupo.admins.includes(interaction.user.id));

        if (interaction.isButton()) {
            const user = interaction.user;

            if (customId === 'maritima_join') {
                if (grupo.miembros.some(u => u.id === user.id))
                    return interaction.reply({ content: 'Ya estas en el escuadron.', flags: MessageFlags.Ephemeral }).catch(() => { });
                if (grupo.miembros.length >= grupo.max)
                    return interaction.reply({ content: 'El escuadron ya esta completo.', flags: MessageFlags.Ephemeral }).catch(() => { });

                grupo.miembros.push({ id: user.id, tag: user.username });
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} se unió al escuadrón.`);
                return;
            }

            if (customId === 'maritima_leave') {
                if (!grupo.miembros.some(u => u.id === user.id))
                    return interaction.reply({ content: 'No formas parte de este escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} salió del escuadrón.`);
                return;
            }

            if (customId === 'maritima_add') {
                if (!isOwner)
                    return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });

                const espacio = Math.max(0, grupo.max - grupo.miembros.length);
                if (espacio === 0)
                    return interaction.reply({ content: 'No hay cupos disponibles.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`maritima_add_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para agregar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({ content: 'Elige usuarios para agregar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_remove') {
                if (!isOwner)
                    return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });
                if (grupo.miembros.length === 0)
                    return interaction.reply({ content: 'No hay miembros para eliminar.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const espacio = grupo.miembros.length;
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`maritima_remove_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para eliminar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({ content: 'Elige usuarios para eliminar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_set_galeon') {
                const idx = grupo.miembros.findIndex(u => u.id === user.id);
                if (idx === -1)
                    return interaction.reply({ content: 'Primero debes unirte al escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const MAX_GALEON = grupo.maxGaleon ?? 7;
                const galeonCount = grupo.miembros.filter(u => u.barco === 'galeon').length;
                const yaEsGaleon = grupo.miembros[idx].barco === 'galeon';

                if (!yaEsGaleon && galeonCount >= MAX_GALEON) {
                    return interaction.reply({
                        content: `Cupo de Galeon de Gremio lleno (máx ${MAX_GALEON}).`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                grupo.miembros[idx].barco = 'galeon';
                savePartys();
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return interaction.reply({ content: 'Te registraste como Galeon de Gremio.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_set_reserva_canonero') {
                const idx = grupo.miembros.findIndex(u => u.id === user.id);
                if (idx === -1)
                    return interaction.reply({ content: 'Primero debes unirte al escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const MAX_RESERVA_CANONERO = grupo.maxReservaCanonero ?? 5;
                const reservaCanoneroCount = grupo.miembros.filter(u => u.barco === 'reserva_canonero').length;
                const yaEsReservaCanonero = grupo.miembros[idx].barco === 'reserva_canonero';

                if (!yaEsReservaCanonero && reservaCanoneroCount >= MAX_RESERVA_CANONERO) {
                    return interaction.reply({
                        content: `Cupo de Cañonero de reserva lleno (máx ${MAX_RESERVA_CANONERO}).`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                grupo.miembros[idx].barco = 'reserva_canonero';
                savePartys();
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return interaction.reply({ content: 'Te registraste como Cañonero de reserva.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_set_reserva_barco') {
                const idx = grupo.miembros.findIndex(u => u.id === user.id);
                if (idx === -1)
                    return interaction.reply({ content: 'Primero debes unirte al escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const MAX_RESERVA_BARCO = grupo.maxReservaBarco ?? 5;
                const reservaBarcoCount = grupo.miembros.filter(u => u.barco === 'reserva_barco').length;
                const yaEsReservaBarco = grupo.miembros[idx].barco === 'reserva_barco';

                if (!yaEsReservaBarco && reservaBarcoCount >= MAX_RESERVA_BARCO) {
                    return interaction.reply({
                        content: `Cupo de Barco de reserva lleno (máx ${MAX_RESERVA_BARCO}).`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                grupo.miembros[idx].barco = 'reserva_barco';
                savePartys();
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return interaction.reply({ content: 'Te registraste como Barco de reserva.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_set_propio') {
                const idx = grupo.miembros.findIndex(u => u.id === user.id);
                if (idx === -1)
                    return interaction.reply({ content: 'Primero debes unirte al escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const MAX_PROPIO = grupo.maxPropio ?? 12;
                const propioCount = grupo.miembros.filter(u => u.barco === 'propio').length;
                const yaEsPropio = grupo.miembros[idx].barco === 'propio';

                if (!yaEsPropio && propioCount >= MAX_PROPIO) {
                    return interaction.reply({
                        content: `Cupo de Barco propio lleno (máx ${MAX_PROPIO}).`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => { });
                }

                grupo.miembros[idx].barco = 'propio';
                savePartys();
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return interaction.reply({ content: 'Te registraste con barco propio.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (customId === 'maritima_set_capitan') {
                const idx = grupo.miembros.findIndex(u => u.id === user.id);
                if (idx === -1)
                    return interaction.reply({ content: 'Primero debes unirte al escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const currentCapitanIndex = grupo.miembros.findIndex(u => u.barco === 'capitan');
                const isAlreadyCapitan = currentCapitanIndex !== -1 && grupo.miembros[currentCapitanIndex].id === user.id;

                if (isAlreadyCapitan) {
                    delete grupo.miembros[currentCapitanIndex].barco;
                    savePartys();
                    await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                    return interaction.reply({ content: 'Ya no eres el Capitán.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                if (currentCapitanIndex !== -1) {
                    delete grupo.miembros[currentCapitanIndex].barco;
                }

                grupo.miembros[idx].barco = 'capitan';
                savePartys();
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return interaction.reply({ content: 'Ahora eres el Capitán.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
        }

        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('maritima_add_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo)
                return interaction.reply({ content: 'Este escuadrón ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (!isOwner)
                return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });

            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            if (espacio === 0)
                return interaction.update({ components: [] }).catch(() => { });

            const ids = interaction.values ?? [];
            const nuevos = ids.filter(id => !grupo.miembros.some(m => m.id === id)).slice(0, espacio);

            for (const id of nuevos) {
                const member = interaction.guild?.members?.cache?.get(id);
                const tag = member?.user?.username ?? id;
                grupo.miembros.push({ id, tag });
            }
            savePartys();

            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Agregados ${nuevos.length} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('maritima_remove_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo)
                return interaction.reply({ content: 'Este escuadrón ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (!isOwner)
                return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });

            const ids = interaction.values ?? [];
            grupo.miembros = grupo.miembros.filter(u => !ids.includes(u.id));
            savePartys();

            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Eliminados ${ids.length} miembro(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }
    },

    async renderGrupo(interaction, grupo, msgEphemeral) {
        const inscritos = grupo.miembros.length;
        const galeon = grupo.miembros.filter(u => u.barco === 'galeon');
        const reservaCanonero = grupo.miembros.filter(u => u.barco === 'reserva_canonero');
        const reservaBarco = grupo.miembros.filter(u => u.barco === 'reserva_barco');
        const propio = grupo.miembros.filter(u => u.barco === 'propio');
        const capitan = grupo.miembros.filter(u => u.barco === 'capitan');
        const sinTipo = grupo.miembros.filter(u => !u.barco);

        const MAX_GALEON = grupo.maxGaleon ?? 7;
        const MAX_RESERVA_CANONERO = grupo.maxReservaCanonero ?? 5;
        const MAX_RESERVA_BARCO = grupo.maxReservaBarco ?? 5;
        const MAX_PROPIO = grupo.maxPropio ?? 12;

        const txtGaleon = galeon.length ? galeon.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtReservaCanonero = reservaCanonero.length ? reservaCanonero.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtReservaBarco = reservaBarco.length ? reservaBarco.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtPropio = propio.length ? propio.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtCapitan = capitan.length ? capitan.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtSinTipo = sinTipo.length ? sinTipo.map(u => `• <@${u.id}>`).join('\n') : '—';

        const horarioTexto = `<t:${grupo.nodeTs}:F> (<t:${grupo.nodeTs}:t>)`;
        const countdownTexto = `<t:${grupo.nodeTs}:R>`;

        const embed = new EmbedBuilder()
            .setColor(grupo.color ?? 0x3498db)
            .setTitle('⚓ NODE MARITIMA ⚓')
            .setDescription([
                'Prepárate para zarpar en la node maritima.',
                'Usa el botón **verde** para unirte y luego elige tu rol/barco.'
            ].join('\n'))
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                { name: '📌 Server', value: "O'dyllita-1", inline: false },
                { name: `🛟 Capitán (${capitan.length})`, value: txtCapitan, inline: false },
                { name: `Galeon de Gremio (${galeon.length}/${MAX_GALEON})`, value: txtGaleon, inline: false },
                { name: `Cañonero de reserva (${reservaCanonero.length}/${MAX_RESERVA_CANONERO})`, value: txtReservaCanonero, inline: false },
                { name: `⚓ Barco propio (${propio.length}/${MAX_PROPIO})`, value: txtPropio, inline: false },
                { name: `Barco de reserva (${reservaBarco.length}/${MAX_RESERVA_BARCO})`, value: txtReservaBarco, inline: false },
                { name: `👤 Sin rol (${sinTipo.length})`, value: txtSinTipo, inline: false },
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1453422810599784448/e5807e96e8620251114102528756.png?ex=694d64f9&is=694c1379&hm=fd39a4ce025893e99d6a2c5282f6996d2d53b9ef57f47d46013ffa2d5df0d971&')
            .setImage('https://s1.pearlcdn.com/NAEU/Upload/News/4343e5ba0d820240110090134694.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const galeonFull = galeon.length >= MAX_GALEON;
        const reservaCanoneroFull = reservaCanonero.length >= MAX_RESERVA_CANONERO;
        const reservaBarcoFull = reservaBarco.length >= MAX_RESERVA_BARCO;
        const propioFull = propio.length >= MAX_PROPIO;

        const joinBtn = new ButtonBuilder()
            .setCustomId('maritima_join')
            .setLabel('Unirme')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Success)
            .setDisabled(inscritos >= grupo.max);

        const leaveBtn = new ButtonBuilder()
            .setCustomId('maritima_leave')
            .setLabel('Salir')
            .setEmoji('🚫')
            .setStyle(ButtonStyle.Danger);

        const galeonBtn = new ButtonBuilder()
            .setCustomId('maritima_set_galeon')
            .setLabel('🚢 Galeon de Gremio')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(galeonFull);

        const canoneroReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_canonero')
            .setLabel('💣 Cañonero de reserva')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(reservaCanoneroFull);

        const barcoReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_barco')
            .setLabel('🛟 Barco de reserva')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(reservaBarcoFull);

        const propioBtn = new ButtonBuilder()
            .setCustomId('maritima_set_propio')
            .setLabel('⚓ Barco propio')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(propioFull);

        const capitanBtn = new ButtonBuilder()
            .setCustomId('maritima_set_capitan')
            .setLabel('🚢🛟 Capitán')
            .setStyle(ButtonStyle.Danger);

        const addBtn = new ButtonBuilder().setCustomId('maritima_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const removeBtn = new ButtonBuilder().setCustomId('maritima_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn);
        const rowBottom = new ActionRowBuilder().addComponents(galeonBtn, canoneroReservaBtn, propioBtn, barcoReservaBtn, capitanBtn);

        await interaction.message.edit({ embeds: [embed], components: [rowTop, rowBottom] }).catch(() => { });

        if (msgEphemeral) {
            try {
                if (interaction.replied || interaction.deferred)
                    await interaction.followUp({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
                else
                    await interaction.reply({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
            } catch { }
        }
    },

    async renderGrupoFromMessageId(interaction, grupo) {
        const channel = interaction.channel;
        if (!channel) return;
        const message = await channel.messages.fetch(grupo.mensajeId).catch(() => null);
        if (!message) return;

        const inscritos = grupo.miembros.length;
        const galeon = grupo.miembros.filter(u => u.barco === 'galeon');
        const reservaCanonero = grupo.miembros.filter(u => u.barco === 'reserva_canonero');
        const reservaBarco = grupo.miembros.filter(u => u.barco === 'reserva_barco');
        const propio = grupo.miembros.filter(u => u.barco === 'propio');
        const capitan = grupo.miembros.filter(u => u.barco === 'capitan');
        const sinTipo = grupo.miembros.filter(u => !u.barco);

        const MAX_GALEON = grupo.maxGaleon ?? 7;
        const MAX_RESERVA_CANONERO = grupo.maxReservaCanonero ?? 5;
        const MAX_RESERVA_BARCO = grupo.maxReservaBarco ?? 5;
        const MAX_PROPIO = grupo.maxPropio ?? 12;

        const txtGaleon = galeon.length ? galeon.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtReservaCanonero = reservaCanonero.length ? reservaCanonero.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtReservaBarco = reservaBarco.length ? reservaBarco.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtPropio = propio.length ? propio.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtCapitan = capitan.length ? capitan.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n') : '— Sin asignar —';
        const txtSinTipo = sinTipo.length ? sinTipo.map(u => `• <@${u.id}>`).join('\n') : '—';

        const horarioTexto = `<t:${grupo.nodeTs}:F> (<t:${grupo.nodeTs}:t>)`;
        const countdownTexto = `<t:${grupo.nodeTs}:R>`;

        const embed = new EmbedBuilder()
            .setColor(grupo.color ?? 0x3498db)
            .setTitle('⚓ NODE MARITIMA ⚓')
            .setDescription([
                'Prepárate para zarpar en la node maritima.',
                'Usa el botón **verde** para unirte y luego elige tu rol/barco.'
            ].join('\n'))
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                { name: '📌 Server', value: "O'dyllita-1", inline: false },
                { name: `🛟 Capitán (${capitan.length})`, value: txtCapitan, inline: false },
                { name: `Galeon de Gremio (${galeon.length}/${MAX_GALEON})`, value: txtGaleon, inline: false },
                { name: `Cañonero de reserva (${reservaCanonero.length}/${MAX_RESERVA_CANONERO})`, value: txtReservaCanonero, inline: false },
                { name: `⚓ Barco propio (${propio.length}/${MAX_PROPIO})`, value: txtPropio, inline: false },
                { name: `Barco de reserva (${reservaBarco.length}/${MAX_RESERVA_BARCO})`, value: txtReservaBarco, inline: false },
                { name: `👤 Sin rol (${sinTipo.length})`, value: txtSinTipo, inline: false }
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1453422810599784448/e5807e96e8620251114102528756.png?ex=694d64f9&is=694c1379&hm=fd39a4ce025893e99d6a2c5282f6996d2d53b9ef57f47d46013ffa2d5df0d971&')
            .setImage('https://s1.pearlcdn.com/NAEU/Upload/News/4343e5ba0d820240110090134694.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const galeonFull = galeon.length >= MAX_GALEON;
        const reservaCanoneroFull = reservaCanonero.length >= MAX_RESERVA_CANONERO;
        const reservaBarcoFull = reservaBarco.length >= MAX_RESERVA_BARCO;
        const propioFull = propio.length >= MAX_PROPIO;

        const joinBtn = new ButtonBuilder()
            .setCustomId('maritima_join')
            .setLabel('Unirme')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Success)
            .setDisabled(inscritos >= grupo.max);

        const leaveBtn = new ButtonBuilder()
            .setCustomId('maritima_leave')
            .setLabel('Salir')
            .setEmoji('🚫')
            .setStyle(ButtonStyle.Danger);

        const galeonBtn = new ButtonBuilder()
            .setCustomId('maritima_set_galeon')
            .setLabel('🚢 Galeon de Gremio')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(galeonFull);

        const canoneroReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_canonero')
            .setLabel('💣 Cañonero de reserva')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(reservaCanoneroFull);

        const barcoReservaBtn = new ButtonBuilder()
            .setCustomId('maritima_set_reserva_barco')
            .setLabel('🛟 Barco de reserva')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(reservaBarcoFull);

        const propioBtn = new ButtonBuilder()
            .setCustomId('maritima_set_propio')
            .setLabel('⚓ Barco propio')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(propioFull);

        const capitanBtn = new ButtonBuilder()
            .setCustomId('maritima_set_capitan')
            .setLabel('🚢🛟 Capitán')
            .setStyle(ButtonStyle.Danger);

        const addBtn = new ButtonBuilder().setCustomId('maritima_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const removeBtn = new ButtonBuilder().setCustomId('maritima_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn);
        const rowBottom = new ActionRowBuilder().addComponents(galeonBtn, canoneroReservaBtn, propioBtn, barcoReservaBtn, capitanBtn);

        await message.edit({ embeds: [embed], components: [rowTop, rowBottom] }).catch(() => { });
    }
};

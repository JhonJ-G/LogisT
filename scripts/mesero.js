document.getElementById('pedidoForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const cliente = document.getElementById('cliente').value.trim();
            const mesa = document.getElementById('mesa').value;
            const masa_cerdo = parseInt(document.getElementById('masa_cerdo').value, 10) || 0;
            const masa_pollo = parseInt(document.getElementById('masa_pollo').value, 10) || 0;
            const arroz_pollo = parseInt(document.getElementById('arroz_pollo').value, 10) || 0;
            const arroz_cerdo = parseInt(document.getElementById('arroz_cerdo').value, 10) || 0;
            const modalidad = document.getElementById('modalidad').value;

            const total_tamales = masa_cerdo + masa_pollo + arroz_pollo + arroz_cerdo;
            const valor_tamales = total_tamales * 10000;

            if (!cliente || !mesa || total_tamales === 0) {
                alert('Por favor complete todos los campos y agregue al menos un tamal.');
                return;
            }

            const pedido = {
                cliente,
                mesa,
                tamales: {
                    masa_cerdo,
                    masa_pollo,
                    arroz_pollo,
                    arroz_cerdo
                },
                total_tamales,
                valor_tamales,
                modalidad,
                estado: 'pendiente',
                timestamp: Date.now()
            };

            // Guardar bajo /pedidos/AAAA-MM/pushid
            const fecha = new Date();
            const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
            firebase.database().ref('pedidos/' + mes).push(pedido)
                .then(() => {
                    document.getElementById('confirmacion').textContent = '¡Pedido enviado!';
                    document.getElementById('confirmacion').classList.remove('hidden');
                    document.getElementById('pedidoForm').reset();
                    setTimeout(() => {
                        document.getElementById('confirmacion').classList.add('hidden');
                    }, 2000);
                })
                .catch(() => {
                    alert('Error al enviar el pedido. Intente de nuevo.');
                });
        });

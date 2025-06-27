const listaPedidosPendientes = document.getElementById('listaPedidosPendientes');
const listaPedidosPagados = document.getElementById('listaPedidosPagados');
const listaPedidosCancelados = document.getElementById('listaPedidosCancelados');
const metodoPagoInput = document.getElementById('metodoPago');
const notificacion = document.getElementById('notificacion');
const modal = document.getElementById('modalPedido');
const detallePedido = document.getElementById('detallePedido');
const aceptarBtn = document.getElementById('aceptarPedido');
const cancelarBtn = document.getElementById('cancelarPedido');
const confirmarPagoBtn = document.getElementById('confirmarPago');
const cerrarModal = document.getElementById('cerrarModal');
const adicionalesInput = document.getElementById('adicionales');
const mostrarCrearPedidoBtn = document.getElementById('mostrarCrearPedido');
const formCrearPedido = document.getElementById('formCrearPedido');
const confirmacionCaja = document.getElementById('confirmacionCaja');
let pedidoActualId = null;
let pedidoActualRef = null;
let pedidoActual = null;

const fecha = new Date();
const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
const pedidosRef = firebase.database().ref('pedidos/' + mes);
const ventasRef = firebase.database().ref('ventas/' + mes);
const pendientesRef = firebase.database().ref('pendientes/' + mes);

let primerCarga = true;

pedidosRef.on('child_added', snapshot => {
    const pedido = snapshot.val();
    const id = snapshot.key;
    if (pedido.estado === 'pendiente') {
        mostrarModalPedido(id, pedido);
    }
});

function mostrarModalPedido(id, pedido) {
    pedidoActualId = id;
    pedidoActualRef = pedidosRef.child(id);
    pedidoActual = pedido;

    // Formateo de moneda colombiana
    function formatCOP(num) {
        return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    }

    // Descripción bonita
    detallePedido.innerHTML = `
        <h3>Pedido de <span style="color:#007bff">${pedido.cliente}</span> (Mesa <b>${pedido.mesa}</b>)</h3>
        <div style="margin: 1rem 0; text-align:left;">
            <div><b>Tamales:</b></div>
            <ul style="margin:0.3rem 0 0 1.2rem;padding:0;">
                <li>Masa Cerdo: <b>${pedido.tamales.masa_cerdo}</b></li>
                <li>Masa Pollo: <b>${pedido.tamales.masa_pollo}</b></li>
                <li>Arroz Pollo: <b>${pedido.tamales.arroz_pollo}</b></li>
                <li>Arroz Cerdo: <b>${pedido.tamales.arroz_cerdo}</b></li>
            </ul>
            <div style="margin-top:0.7rem;"><b>Modalidad:</b> ${pedido.modalidad}</div>
            <div><b>Total Tamales:</b> ${pedido.total_tamales}</div>
            <div><b>Valor Tamales:</b> ${formatCOP(pedido.valor_tamales)}</div>
        </div>
    `;
    adicionalesInput.value = 0;
    metodoPagoInput.value = "efectivo";
    // Campo para "con cuánto paga" solo si es efectivo
    let pagoEfectivoDiv = document.getElementById('pagoEfectivoDiv');
    if (!pagoEfectivoDiv) {
        pagoEfectivoDiv = document.createElement('div');
        pagoEfectivoDiv.id = 'pagoEfectivoDiv';
        adicionalesInput.parentNode.insertBefore(pagoEfectivoDiv, adicionalesInput.nextSibling);
    }
    pagoEfectivoDiv.innerHTML = `
        <div id="campoPagoEfectivo" style="margin-top:0.7rem; display:none;">
            <label for="conCuantoPaga"><b>¿Con cuánto paga?</b></label>
            <div style="display:flex;gap:0.5rem;margin-bottom:0.4rem;">
                <button type="button" class="btn-cop-sugerido" data-valor="10000">$10.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="20000">$20.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="50000">$50.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="100000">$100.000</button>
            </div>
            <input type="number" id="conCuantoPaga" min="0" style="width:100%;margin-top:0.2rem;">
            <div id="vueltasInfo" style="margin-top:0.3rem;color:#388e3c;font-weight:bold;"></div>
        </div>
    `;

    // Mostrar/ocultar campo según método de pago
    metodoPagoInput.onchange = function() {
        const campo = document.getElementById('campoPagoEfectivo');
        if (this.value === 'efectivo') {
            campo.style.display = '';
        } else {
            campo.style.display = 'none';
        }
        document.getElementById('conCuantoPaga').value = '';
        document.getElementById('vueltasInfo').textContent = '';
    };
    metodoPagoInput.onchange(); // inicializa

    // Calcular vueltas en tiempo real
    document.getElementById('conCuantoPaga').oninput = function() {
        const total = (pedido.valor_tamales || 0) + (parseFloat(adicionalesInput.value) || 0);
        const pagado = parseFloat(this.value) || 0;
        const vueltas = pagado - total;
        document.getElementById('vueltasInfo').textContent =
            vueltas >= 0 ? `Vueltas: ${formatCOP(vueltas)}` : '';
    };
    adicionalesInput.oninput = function() {
        document.getElementById('conCuantoPaga').dispatchEvent(new Event('input'));
    };

    // Botones sugeridos para pago efectivo
    document.querySelectorAll('.btn-cop-sugerido').forEach(btn => {
        btn.onclick = function() {
            document.getElementById('conCuantoPaga').value = this.getAttribute('data-valor');
            document.getElementById('conCuantoPaga').dispatchEvent(new Event('input'));
        };
    });

    // Botones personalizados
    aceptarBtn.style.display = 'none'; // Ocultar aceptar en modal de pago
    cancelarBtn.style.display = '';
    confirmarPagoBtn.style.display = '';
    confirmarPagoBtn.textContent = 'Confirmar Pago';
    confirmarPagoBtn.style.background = '#43a047';
    confirmarPagoBtn.style.color = '#fff';
    cancelarBtn.textContent = 'Cancelar';
    cancelarBtn.style.background = '#e53935';
    cancelarBtn.style.color = '#fff';

    modal.classList.remove('hidden');

    confirmarPagoBtn.onclick = function() {
        if (!pedidoActual) return;
        const adicionales = parseFloat(adicionalesInput.value) || 0;
        const metodo_pago = metodoPagoInput.value;
        let pagado = 0;
        if (metodo_pago === 'efectivo') {
            pagado = parseFloat(document.getElementById('conCuantoPaga').value) || 0;
            const total = (pedido.valor_tamales || 0) + adicionales;
            if (pagado < total) {
                alert('El valor pagado es menor al total.');
                return;
            }
        }
        const registroVenta = {
            hora: new Date().toLocaleTimeString(),
            descripcion: `Masa Cerdo: ${pedidoActual.tamales.masa_cerdo}, Masa Pollo: ${pedidoActual.tamales.masa_pollo}, Arroz Pollo: ${pedidoActual.tamales.arroz_pollo}, Arroz Cerdo: ${pedidoActual.tamales.arroz_cerdo}`,
            total_tamales: pedidoActual.total_tamales,
            valor_tamales: pedidoActual.valor_tamales,
            adicionales,
            modalidad: pedidoActual.modalidad,
            metodo_pago,
            pagado: metodo_pago === 'efectivo' ? pagado : undefined,
            vueltas: metodo_pago === 'efectivo' ? (pagado - ((pedido.valor_tamales || 0) + adicionales)) : undefined,
            cliente: pedidoActual.cliente,
            mesa: pedidoActual.mesa,
            timestamp: Date.now()
        };
        const mes = getMes();
        const ventasRef = firebase.database().ref('ventas/' + mes);
        ventasRef.push(registroVenta);
        if (pedidoActualRef) {
            pedidoActualRef.update({ estado: 'pagado', adicionales, metodo_pago, pagado, vueltas: registroVenta.vueltas });
        }
        modal.classList.add('hidden');
        mostrarModalPagoConfirmado();
    };

    cancelarBtn.onclick = function() {
        if (pedidoActualRef) {
            pedidoActualRef.remove();
        }
        modal.classList.add('hidden');
    };

    cerrarModal.onclick = function() {
        modal.classList.add('hidden');
    };
}

// Modal de pago confirmado
function mostrarModalPagoConfirmado() {
    let modalConfirm = document.getElementById('modalPagoConfirmado');
    if (!modalConfirm) {
        modalConfirm = document.createElement('div');
        modalConfirm.id = 'modalPagoConfirmado';
        modalConfirm.className = 'modal';
        modalConfirm.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <h2 style="color:#43a047;margin-bottom:1.2rem;">¡Pago confirmado!</h2>
                <button id="cerrarModalPagoConfirmado" class="main-btn" style="background:#007bff;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modalConfirm);
    }
    modalConfirm.classList.remove('hidden');
    document.getElementById('cerrarModalPagoConfirmado').onclick = function() {
        modalConfirm.classList.add('hidden');
    };
}

// Mostrar pedidos pendientes y pagados
function renderPedidos() {
    const fecha = new Date();
    const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
    const pedidosRef = firebase.database().ref('pedidos/' + mes);

    pedidosRef.on('value', snapshot => {
        listaPedidosPendientes.innerHTML = '';
        listaPedidosPagados.innerHTML = '';
        const pedidos = snapshot.val() || {};
        Object.entries(pedidos).forEach(([id, pedido]) => {
            if (pedido.estado === 'aceptado' || pedido.estado === 'pendiente') {
                const div = document.createElement('div');
                div.className = 'pedido';
                div.style.marginBottom = '2.2rem'; // separa los pedidos pendientes
                div.innerHTML = `
                    <div><strong>Cliente:</strong> ${pedido.cliente}</div>
                    <div><strong>Mesa:</strong> ${pedido.mesa}</div>
                    <div><strong>Tamales:</strong>
                        Masa Cerdo: ${pedido.tamales.masa_cerdo},
                        Masa Pollo: ${pedido.tamales.masa_pollo},
                        Arroz Pollo: ${pedido.tamales.arroz_pollo},
                        Arroz Cerdo: ${pedido.tamales.arroz_cerdo}
                    </div>
                    <div><strong>Modalidad:</strong> ${pedido.modalidad}</div>
                    <div><strong>Total Tamales:</strong> ${pedido.total_tamales}</div>
                    <div><strong>Valor Tamales:</strong> $${pedido.valor_tamales.toLocaleString('es-CO')}</div>
                    <button class="main-btn btn-pagar" data-id="${id}">Confirmar Pago</button>
                    <button class="main-btn btn-cancelar" data-id="${id}">Cancelar</button>
                `;
                listaPedidosPendientes.appendChild(div);
            } else if (pedido.estado === 'pagado') {
                const div = document.createElement('div');
                div.className = 'pedido preparado';
                div.style.marginBottom = '2.2rem'; // separa los pedidos pagados
                div.innerHTML = `
                    <div><strong>Cliente:</strong> ${pedido.cliente}</div>
                    <div><strong>Mesa:</strong> ${pedido.mesa}</div>
                    <div><strong>Tamales:</strong>
                        Masa Cerdo: ${pedido.tamales.masa_cerdo},
                        Masa Pollo: ${pedido.tamales.masa_pollo},
                        Arroz Pollo: ${pedido.tamales.arroz_pollo},
                        Arroz Cerdo: ${pedido.tamales.arroz_cerdo}
                    </div>
                    <div><strong>Modalidad:</strong> ${pedido.modalidad}</div>
                    <div><strong>Total Tamales:</strong> ${pedido.total_tamales}</div>
                    <div><strong>Valor Tamales:</strong> $${pedido.valor_tamales.toLocaleString('es-CO')}</div>
                    <div><strong>Adicionales:</strong> $${(pedido.adicionales || 0).toLocaleString('es-CO')}</div>
                    <div><strong>Método de pago:</strong> ${pedido.metodo_pago || ''}</div>
                    <div class="estado">PAGADO</div>
                `;
                listaPedidosPagados.appendChild(div);
            }
        });

        // Asignar eventos a los botones de pago y cancelar
        document.querySelectorAll('.btn-pagar').forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute('data-id');
                mostrarModalPago(id, pedidos[id]);
            };
        });
        document.querySelectorAll('.btn-cancelar').forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute('data-id');
                cancelarPedido(id, pedidos[id]);
            };
        });
    });
}

function mostrarModalPago(id, pedido) {
    // Reutiliza la función para mantener la lógica centralizada
    mostrarModalPedido(id, pedido);
}

function cancelarPedido(id, pedido) {
    const ref = firebase.database().ref('pedidos/' + getMes() + '/' + id);
    ref.remove();
}

confirmarPagoBtn.onclick = function() {
    if (!pedidoActual) return;
    const adicionales = parseFloat(adicionalesInput.value) || 0;
    const metodo_pago = metodoPagoInput.value;
    const registroVenta = {
        hora: new Date().toLocaleTimeString(),
        descripcion: `Masa Cerdo: ${pedidoActual.tamales.masa_cerdo}, Masa Pollo: ${pedidoActual.tamales.masa_pollo}, Arroz Pollo: ${pedidoActual.tamales.arroz_pollo}, Arroz Cerdo: ${pedidoActual.tamales.arroz_cerdo}`,
        total_tamales: pedidoActual.total_tamales,
        valor_tamales: pedidoActual.valor_tamales,
        adicionales,
        modalidad: pedidoActual.modalidad,
        metodo_pago,
        cliente: pedidoActual.cliente,
        mesa: pedidoActual.mesa,
        timestamp: Date.now()
    };
    const mes = getMes();
    const ventasRef = firebase.database().ref('ventas/' + mes);
    ventasRef.push(registroVenta);
    if (pedidoActualRef) {
        pedidoActualRef.update({ estado: 'pagado', adicionales, metodo_pago });
    }
    modal.classList.add('hidden');
};

cancelarBtn.onclick = function() {
    if (pedidoActualRef) {
        pedidoActualRef.remove();
    }
    modal.classList.add('hidden');
};

cerrarModal.onclick = function() {
    modal.classList.add('hidden');
};

// Inicializar renderizado de pedidos
renderPedidos();

document.getElementById('descargarPedidos').onclick = function() {
    const fecha = new Date();
    const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
    const ventasRef = firebase.database().ref('ventas/' + mes);

    ventasRef.once('value').then(snapshot => {
        const ventas = snapshot.val() || {};
        const datos = Object.values(ventas);

        // Generar CSV
        const csv = [
            ['Hora', 'Cliente', 'Mesa', 'Descripción', 'Total Tamales', 'Valor Tamales', 'Adicionales', 'Modalidad'].join(','),
            ...datos.map(v => [
                `"${v.hora || ''}"`,
                `"${v.cliente || ''}"`,
                `"${v.mesa || ''}"`,
                `"${v.descripcion || ''}"`,
                `"${v.total_tamales || 0}"`,
                `"${v.valor_tamales || 0}"`,
                `"${v.adicionales || 0}"`,
                `"${v.modalidad || ''}"`
            ].join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ventas_${mes}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        // Calcular resumen
        let totalTamales = 0;
        let totalAdicionales = 0;
        let totalDineroTamales = 0;
        datos.forEach(v => {
            totalTamales += Number(v.total_tamales) || 0;
            totalAdicionales += Number(v.adicionales) || 0;
            totalDineroTamales += Number(v.valor_tamales) || 0;
        });
        const totalPedidos = datos.length;
        alert(
            `Resumen de ventas del mes:\n\n` +
            `Pedidos pagados: ${totalPedidos}\n` +
            `Total tamales vendidos: ${totalTamales}\n` +
            `Total dinero tamales: $${totalDineroTamales}\n` +
            `Total dinero adicionales: $${totalAdicionales}\n` +
            `Total general: $${totalDineroTamales + totalAdicionales}\n`
        );
    });
};

mostrarCrearPedidoBtn.onclick = function() {
    // Cambia el formulario a modo modal dinámico
    let modalCrear = document.getElementById('modalCrearPedidoCaja');
    if (!modalCrear) {
        modalCrear = document.createElement('div');
        modalCrear.id = 'modalCrearPedidoCaja';
        modalCrear.className = 'modal';
        modalCrear.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <span id="cerrarModalCrearPedidoCaja" class="close" style="right:1.2rem;">&times;</span>
                <h3>Nuevo Pedido (Caja)</h3>
                <form id="formCrearPedidoModal">
                    <label for="clienteCajaModal">Nombre del Cliente:</label>
                    <input type="text" id="clienteCajaModal" required>
                    <input type="hidden" id="mesaCajaModal" value="domicilio">
                    <fieldset>
                        <legend>Tamales (cantidad):</legend>
                        <label>Masa Cerdo: <input type="number" min="0" id="masa_cerdoCajaModal" value="0"></label>
                        <label>Masa Pollo: <input type="number" min="0" id="masa_polloCajaModal" value="0"></label>
                        <label>Arroz Pollo: <input type="number" min="0" id="arroz_polloCajaModal" value="0"></label>
                        <label>Arroz Cerdo: <input type="number" min="0" id="arroz_cerdoCajaModal" value="0"></label>
                    </fieldset>
                    <input type="hidden" id="modalidadCajaModal" value="domicilio">
                    <div><strong>Modalidad:</strong> Domicilio</div>
                    <button type="submit" class="main-btn">Enviar Pedido</button>
                    <div id="confirmacionCajaModal" class="hidden"></div>
                </form>
            </div>
        `;
        document.body.appendChild(modalCrear);

        document.getElementById('cerrarModalCrearPedidoCaja').onclick = function() {
            modalCrear.classList.add('hidden');
        };

        document.getElementById('formCrearPedidoModal').onsubmit = function(e) {
            e.preventDefault();
            const cliente = document.getElementById('clienteCajaModal').value.trim();
            const mesa = document.getElementById('mesaCajaModal').value;
            const masa_cerdo = parseInt(document.getElementById('masa_cerdoCajaModal').value, 10) || 0;
            const masa_pollo = parseInt(document.getElementById('masa_polloCajaModal').value, 10) || 0;
            const arroz_pollo = parseInt(document.getElementById('arroz_polloCajaModal').value, 10) || 0;
            const arroz_cerdo = parseInt(document.getElementById('arroz_cerdoCajaModal').value, 10) || 0;
            const modalidad = document.getElementById('modalidadCajaModal').value;

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

            const fecha = new Date();
            const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
            firebase.database().ref('pedidos/' + mes).push(pedido)
                .then(() => {
                    const confirmacion = document.getElementById('confirmacionCajaModal');
                    confirmacion.textContent = '¡Pedido enviado!';
                    confirmacion.classList.remove('hidden');
                    this.reset();
                    setTimeout(() => {
                        confirmacion.classList.add('hidden');
                        modalCrear.classList.add('hidden');
                    }, 1500);
                })
                .catch(() => {
                    alert('Error al enviar el pedido. Intente de nuevo.');
                });
        };
    }
    modalCrear.classList.remove('hidden');
};
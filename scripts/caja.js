// Agrega esta función utilitaria al inicio del archivo
function getMes() {
    const fecha = new Date();
    return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
}

const listaPedidosPendientes = document.getElementById('listaPedidosPendientes');
const listaPedidosPagados = document.getElementById('listaPedidosPagados');
const metodoPagoInput = document.getElementById('metodoPago');
const modal = document.getElementById('modalPedido');
const detallePedido = document.getElementById('detallePedido');
const aceptarBtn = document.getElementById('aceptarPedido');
const cancelarBtn = document.getElementById('cancelarPedido');
const confirmarPagoBtn = document.getElementById('confirmarPago');
const cerrarModal = document.getElementById('cerrarModal');
const adicionalesInput = document.getElementById('adicionales');
const mostrarCrearPedidoBtn = document.getElementById('mostrarCrearPedido');
let pedidoActualId = null;
let pedidoActualRef = null;
let pedidoActual = null;

const fecha = new Date();
const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
const pedidosRef = firebase.database().ref('pedidos/' + mes);
const ventasRef = firebase.database().ref('ventas/' + mes);

// Sistema de cola FIFO para pedidos pendientes
let colaPedidosPendientes = [];
let mostrandoModalPendiente = false;

// Función para actualizar el botón de notificaciones
function actualizarBotonNotificaciones() {
    const btn = document.getElementById('btnNotificacionesCaja');
    const count = colaPedidosPendientes.length;
    if (btn) {
        const iconoElement = document.getElementById('iconoNotiCaja');
        const countElement = document.getElementById('notiCount');
        
        countElement.textContent = count;
        iconoElement.textContent = count > 0 ? '🔔' : '🔕';
        
        // Cambiar color del botón según si hay notificaciones
        if (count > 0) {
            btn.style.background = '#e53935';
            btn.style.animation = 'pulse 2s infinite';
        } else {
            btn.style.background = '#007bff';
            btn.style.animation = 'none';
        }
    }
}

// Función para agregar un pedido a la cola
function agregarPedidoACola(id, pedido) {
    const existe = colaPedidosPendientes.find(item => item.id === id);
    if (!existe) {
        colaPedidosPendientes.push({ id, pedido, timestamp: pedido.timestamp || Date.now() });
        colaPedidosPendientes.sort((a, b) => a.timestamp - b.timestamp);
        actualizarBotonNotificaciones();
        
        // SOLO mostrar automáticamente si es el PRIMER pedido Y no hay modal activo
        if (!mostrandoModalPendiente && colaPedidosPendientes.length === 1) {
            mostrarSiguientePedidoPendiente();
        }
        // Si hay más de 1, solo almacenar en la cola sin mostrar automáticamente
    }
}

// Función para remover un pedido de la cola
function removerPedidoDeCola(id) {
    colaPedidosPendientes = colaPedidosPendientes.filter(item => item.id !== id);
    actualizarBotonNotificaciones();
}

// Función para mostrar el siguiente pedido pendiente
function mostrarSiguientePedidoPendiente() {
    if (mostrandoModalPendiente || colaPedidosPendientes.length === 0) {
        return;
    }
    
    mostrandoModalPendiente = true;
    const siguientePedido = colaPedidosPendientes[0];
    mostrarModalConfirmarPedido(siguientePedido.id, siguientePedido.pedido);
}

// Listener para pedidos nuevos
pedidosRef.on('child_added', snapshot => {
    const pedido = snapshot.val();
    const id = snapshot.key;
    if (pedido.estado === 'pendiente' && pedido.origen === 'mesero') {
        agregarPedidoACola(id, pedido);
    }
});

// Listener para cuando se eliminan pedidos
pedidosRef.on('child_removed', snapshot => {
    const id = snapshot.key;
    removerPedidoDeCola(id);
});

// Listener para cuando cambian pedidos
pedidosRef.on('child_changed', snapshot => {
    const pedido = snapshot.val();
    const id = snapshot.key;
    if (pedido.estado !== 'pendiente') {
        removerPedidoDeCola(id);
    }
});

// Evento del botón de notificaciones - SIMPLIFICADO
document.addEventListener('DOMContentLoaded', function() {
    const btnNotificaciones = document.getElementById('btnNotificacionesCaja');
    if (btnNotificaciones) {
        btnNotificaciones.addEventListener('click', function() {
            mostrarSiguientePedidoPendiente();
        });
    }
});

// Modal de confirmación para pedidos nuevos - SIN BOTÓN SIGUIENTE
function mostrarModalConfirmarPedido(id, pedido) {
    let modalConfirmar = document.getElementById('modalConfirmarPedido');
    if (!modalConfirmar) {
        modalConfirmar = document.createElement('div');
        modalConfirmar.id = 'modalConfirmarPedido';
        modalConfirmar.className = 'modal';
        modalConfirmar.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <h3 style="text-align:center;color:#007bff;margin-bottom:1rem;">🔔 Nuevo Pedido Recibido</h3>
                <div id="colaInfo" style="text-align:center;margin-bottom:1rem;color:#666;font-size:0.9rem;"></div>
                <div id="detalleConfirmarPedido"></div>
                <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;">
                    <button id="btnAceptarNuevo" class="main-btn" style="background:#43a047;color:#fff;width:150px;">✅ Aceptar</button>
                    <button id="btnCancelarNuevo" class="main-btn" style="background:#e53935;color:#fff;width:150px;">❌ Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalConfirmar);
    }

    // Mostrar información de la cola
    const posicionEnCola = colaPedidosPendientes.findIndex(item => item.id === id) + 1;
    const totalEnCola = colaPedidosPendientes.length;
    document.getElementById('colaInfo').textContent = `Pedido ${posicionEnCola} de ${totalEnCola} pendientes`;

    // Mostrar información del pedido
    const hora = pedido.timestamp ? new Date(pedido.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
    const clienteInfo = pedido.modalidad === 'local' 
        ? `Mesa <b>${pedido.mesa}</b>`
        : `Cliente <b>${pedido.cliente}</b><br><span style="color:#007bff;font-weight:bold;">📦 Pedido de Domicilio</span>`;
        
    document.getElementById('detalleConfirmarPedido').innerHTML = `
        <div style="background:#f8f9fa;padding:1rem;border-radius:8px;margin-bottom:1rem;">
            <div style="margin-bottom:0.5rem;"><strong>🕐 Hora:</strong> ${hora}</div>
            <div style="margin-bottom:1rem;">${clienteInfo}</div>
            
            <div style="margin-bottom:0.5rem;"><strong>🫔 Tamales:</strong></div>
            <ul style="margin:0.3rem 0 0 1.2rem;padding:0;list-style:none;">
                <li>• Masa Cerdo: <b>${pedido.tamales.masa_cerdo}</b></li>
                <li>• Masa Pollo: <b>${pedido.tamales.masa_pollo}</b></li>
                <li>• Arroz Pollo: <b>${pedido.tamales.arroz_pollo}</b></li>
                <li>• Arroz Cerdo: <b>${pedido.tamales.arroz_cerdo}</b></li>
            </ul>
            
            <div style="margin-top:1rem;padding-top:0.5rem;border-top:1px solid #ddd;">
                <div><strong>📊 Total Tamales:</strong> ${pedido.total_tamales}</div>
                <div><strong>💰 Valor Total:</strong> $${(pedido.valor_tamales || 0).toLocaleString('es-CO')}</div>
            </div>
        </div>
    `;

    // Configurar eventos de botones - SIN AUTO-MOSTRAR EL SIGUIENTE
    document.getElementById('btnAceptarNuevo').onclick = function() {
        firebase.database().ref('pedidos/' + getMes() + '/' + id).update({ estado: 'aceptado' });
        removerPedidoDeCola(id);
        modalConfirmar.classList.add('hidden');
        mostrandoModalPendiente = false;
        mostrarModalPedidoAceptado();
        
        // NO mostrar automáticamente el siguiente pedido
        // El usuario debe usar el botón de notificaciones
    };

    document.getElementById('btnCancelarNuevo').onclick = function() {
        firebase.database().ref('pedidos/' + getMes() + '/' + id).remove();
        removerPedidoDeCola(id);
        modalConfirmar.classList.add('hidden');
        mostrandoModalPendiente = false;
        mostrarModalPedidoCancelado();
        
        // NO mostrar automáticamente el siguiente pedido
        // El usuario debe usar el botón de notificaciones
    };

    modalConfirmar.classList.remove('hidden');
}

// Agregar animación CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    .notification-fab { transition: all 0.3s ease; }
`;
document.head.appendChild(style);

// Inicializar
actualizarBotonNotificaciones();

// Modales de confirmación de acciones
function mostrarModalPedidoAceptado() {
    let modal = document.getElementById('modalPedidoAceptado');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPedidoAceptado';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="text-align:center;max-width:300px;">
                <h3 style="color:#43a047;margin-bottom:1rem;">✅ Pedido Aceptado</h3>
                <p style="color:#666;margin-bottom:1.5rem;">El pedido se ha agregado a "Pendientes de Pago"</p>
                <button id="cerrarModalAceptado" class="main-btn" style="background:#007bff;">Entendido</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cerrarModalAceptado').onclick = function() {
            modal.classList.add('hidden');
        };
    }
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('hidden'), 2000);
}

function mostrarModalPedidoCancelado() {
    let modal = document.getElementById('modalPedidoCancelado');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPedidoCancelado';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="text-align:center;max-width:300px;">
                <h3 style="color:#e53935;margin-bottom:1rem;">❌ Pedido Cancelado</h3>
                <p style="color:#666;margin-bottom:1.5rem;">El pedido ha sido rechazado y eliminado</p>
                <button id="cerrarModalCancelado" class="main-btn" style="background:#007bff;">Entendido</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cerrarModalCancelado').onclick = function() {
            modal.classList.add('hidden');
        };
    }
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('hidden'), 2000);
}

// Mostrar pedidos pendientes y pagados
function renderPedidos() {
    pedidosRef.on('value', snapshot => {
        listaPedidosPendientes.innerHTML = '';
        const pedidos = snapshot.val() || {};
        
        Object.entries(pedidos).forEach(([id, pedido]) => {
            if (pedido.estado === 'aceptado') {
                const hora = pedido.timestamp ? new Date(pedido.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
                const clienteInfo = pedido.modalidad === 'local' 
                    ? `<strong>Mesa:</strong> ${pedido.mesa}`
                    : `<strong>Cliente:</strong> ${pedido.cliente}<br><span style="color:#007bff;font-weight:bold;">📦 Domicilio</span>`;
                
                const div = document.createElement('div');
                div.className = 'pedido';
                div.style.marginBottom = '2.2rem';
                div.innerHTML = `
                    <div><strong>🕐 Hora:</strong> ${hora}</div>
                    ${clienteInfo}
                    <div><strong>Tamales:</strong>
                        Masa Cerdo: ${pedido.tamales.masa_cerdo},
                        Masa Pollo: ${pedido.tamales.masa_pollo},
                        Arroz Pollo: ${pedido.tamales.arroz_pollo},
                        Arroz Cerdo: ${pedido.tamales.arroz_cerdo}
                    </div>
                    <div><strong>Total Tamales:</strong> ${pedido.total_tamales}</div>
                    <div><strong>Valor:</strong> $${pedido.valor_tamales.toLocaleString('es-CO')}</div>
                    <button class="main-btn btnGestionar" data-id="${id}" style="background:#43a047;color:#fff;margin-top:0.5rem;">⚙️ Gestionar</button>
                `;
                listaPedidosPendientes.appendChild(div);
            }
        });

        // Asignar eventos a botones de gestionar - CORREGIDO
        document.querySelectorAll('.btnGestionar').forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute('data-id');
                const pedido = pedidos[id];
                if (pedido) {
                    mostrarModalPedido(id, pedido);
                }
            };
        });
    });

    // Mostrar pedidos pagados desde ventas
    ventasRef.on('value', snapshot => {
        listaPedidosPagados.innerHTML = '';
        const ventas = snapshot.val() || {};
        Object.values(ventas).forEach(venta => {
            const hora = venta.timestamp ? new Date(venta.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
            const clienteInfo = venta.modalidad === 'local' 
                ? `<strong>Mesa:</strong> ${venta.mesa}`
                : `<strong>Cliente:</strong> ${venta.cliente}<br><span style="color:#007bff;">📦 Domicilio</span>`;
            
            const div = document.createElement('div');
            div.className = 'pedido preparado';
            div.style.marginBottom = '2.2rem';
            div.innerHTML = `
                <div><strong>🕐 Hora:</strong> ${hora}</div>
                ${clienteInfo}
                <div><strong>Tamales:</strong> ${venta.descripcion}</div>
                <div><strong>Total Tamales:</strong> ${venta.total_tamales}</div>
                <div><strong>Valor Tamales:</strong> $${(venta.valor_tamales || 0).toLocaleString('es-CO')}</div>
                <div><strong>Adicionales:</strong> $${(venta.adicionales || 0).toLocaleString('es-CO')}</div>
                <div><strong>Total:</strong> $${((venta.valor_tamales || 0) + (venta.adicionales || 0)).toLocaleString('es-CO')}</div>
                <div><strong>Método de pago:</strong> ${venta.metodo_pago || ''}</div>
                ${venta.metodo_pago === 'efectivo' ? `<div><strong>Pagó con:</strong> $${(venta.pagado || 0).toLocaleString('es-CO')}</div>` : ''}
                ${venta.metodo_pago === 'efectivo' ? `<div><strong>Vueltas:</strong> $${(venta.vueltas || 0).toLocaleString('es-CO')}</div>` : ''}
                <div class="estado" style="background:#43a047;color:#fff;padding:0.3rem 0.8rem;border-radius:20px;display:inline-block;margin-top:0.5rem;">✅ PAGADO</div>
            `;
            listaPedidosPagados.appendChild(div);
        });
    });
}

// Modal de gestión de pedido - CORREGIDO
function mostrarModalPedido(id, pedido) {
    console.log('mostrarModalPedido ejecutado:', id, pedido); // TEMPORAL para debug
    
    pedidoActualId = id;
    pedidoActualRef = pedidosRef.child(id);
    pedidoActual = pedido;

    function formatCOP(num) {
        return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    }

    const clienteInfo = pedido.modalidad === 'local' 
        ? `Mesa <b>${pedido.mesa}</b>`
        : `Cliente <b>${pedido.cliente}</b> (Domicilio)`;

    detallePedido.innerHTML = `
        <h3>Gestionar - ${clienteInfo}</h3>
        <div style="margin: 1rem 0; text-align:left;">
            <div><b>Tamales:</b></div>
            <ul style="margin:0.3rem 0 0 1.2rem;padding:0;">
                <li>Masa Cerdo: <b>${pedido.tamales.masa_cerdo}</b></li>
                <li>Masa Pollo: <b>${pedido.tamales.masa_pollo}</b></li>
                <li>Arroz Pollo: <b>${pedido.tamales.arroz_pollo}</b></li>
                <li>Arroz Cerdo: <b>${pedido.tamales.arroz_cerdo}</b></li>
            </ul>
            <div style="margin-top:0.7rem;"><b>Total Tamales:</b> ${pedido.total_tamales}</div>
            <div style="margin-top:0.5rem;"><b>Valor Tamales:</b> ${formatCOP(pedido.valor_tamales)}</div>
        </div>
    `;
    
    // Resetear valores
    adicionalesInput.value = 0;
    metodoPagoInput.value = "efectivo";
    
    // Limpiar elementos dinámicos anteriores
    const existingTotalDiv = document.getElementById('totalPagarDiv');
    const existingPagoDiv = document.getElementById('pagoEfectivoDiv');
    if (existingTotalDiv) existingTotalDiv.remove();
    if (existingPagoDiv) existingPagoDiv.remove();
    
    // Crear contenedor para total a pagar
    const totalPagarDiv = document.createElement('div');
    totalPagarDiv.id = 'totalPagarDiv';
    
    // Crear contenedor para pago efectivo
    const pagoEfectivoDiv = document.createElement('div');
    pagoEfectivoDiv.id = 'pagoEfectivoDiv';
    
    // Insertar después del select de método de pago
    const metodoPagoContainer = metodoPagoInput.parentNode;
    metodoPagoContainer.insertAdjacentElement('afterend', totalPagarDiv);
    totalPagarDiv.insertAdjacentElement('afterend', pagoEfectivoDiv);
    
    pagoEfectivoDiv.innerHTML = `
        <div id="campoPagoEfectivo" style="margin-top:0.7rem;">
            <label for="conCuantoPaga"><b>¿Con cuánto están pagando?</b></label>
            <div style="display:flex;gap:0.5rem;margin:0.5rem 0;flex-wrap:wrap;">
                <button type="button" class="btn-cop-sugerido" data-valor="10000" style="padding:0.3rem 0.6rem;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">$10.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="20000" style="padding:0.3rem 0.6rem;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">$20.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="50000" style="padding:0.3rem 0.6rem;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">$50.000</button>
                <button type="button" class="btn-cop-sugerido" data-valor="100000" style="padding:0.3rem 0.6rem;background:#e9ecef;border:1px solid #ced4da;border-radius:4px;cursor:pointer;">$100.000</button>
            </div>
            <input type="number" id="conCuantoPaga" min="0" placeholder="O ingrese otro valor" style="width:100%;padding:0.5rem;border:1px solid #ced4da;border-radius:4px;margin-bottom:0.5rem;">
            
            <!-- Separar vueltas del total -->
            <div id="vueltasInfo" style="margin-top:0.8rem;padding:0.8rem;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;display:none;">
                <div style="font-size:1.1rem;font-weight:bold;color:#28a745;">Vueltas: <span id="cantidadVueltas">$0</span></div>
            </div>
            
            <div id="faltaInfo" style="margin-top:0.8rem;padding:0.8rem;background:#f8d7da;border-left:4px solid #dc3545;border-radius:4px;display:none;">
                <div style="font-size:1.1rem;font-weight:bold;color:#dc3545;">Falta: <span id="cantidadFalta">$0</span></div>
            </div>
        </div>
    `;

    // Función para actualizar el total del pedido
    function actualizarTotal() {
        const valorTamales = pedido.valor_tamales || 0;
        const adicionales = parseFloat(adicionalesInput.value) || 0;
        const total = valorTamales + adicionales;
        
        totalPagarDiv.innerHTML = `
            <div style="margin-top:1rem;padding:0.8rem;background:#e8f4fd;border-left:4px solid #007bff;border-radius:4px;">
                <div style="font-size:1.1rem;font-weight:bold;color:#007bff;">Total a Pagar: ${formatCOP(total)}</div>
                ${adicionales > 0 ? `<div style="font-size:0.9rem;color:#666;margin-top:0.3rem;">Tamales: ${formatCOP(valorTamales)} + Adicionales: ${formatCOP(adicionales)}</div>` : ''}
            </div>
        `;
    }

    // Inicializar el total
    actualizarTotal();

    // Mostrar/ocultar campo según método de pago
    metodoPagoInput.onchange = function() {
        const campo = document.getElementById('campoPagoEfectivo');
        if (this.value === 'efectivo') {
            campo.style.display = '';
        } else {
            campo.style.display = 'none';
        }
        const conCuantoPagaInput = document.getElementById('conCuantoPaga');
        if (conCuantoPagaInput) {
            conCuantoPagaInput.value = '';
        }
        ocultarVueltas();
    };
    metodoPagoInput.onchange(); // inicializar

    // Función para ocultar información de vueltas
    function ocultarVueltas() {
        const vueltasInfo = document.getElementById('vueltasInfo');
        const faltaInfo = document.getElementById('faltaInfo');
        if (vueltasInfo) vueltasInfo.style.display = 'none';
        if (faltaInfo) faltaInfo.style.display = 'none';
    }

    // Calcular vueltas en tiempo real - MEJORADO
    function calcularVueltas() {
        const valorTamales = pedido.valor_tamales || 0;
        const adicionales = parseFloat(adicionalesInput.value) || 0;
        const total = valorTamales + adicionales;
        const conCuantoPagaInput = document.getElementById('conCuantoPaga');
        const pagado = parseFloat(conCuantoPagaInput ? conCuantoPagaInput.value : 0) || 0;
        const diferencia = pagado - total;
        
        const vueltasInfo = document.getElementById('vueltasInfo');
        const faltaInfo = document.getElementById('faltaInfo');
        const cantidadVueltas = document.getElementById('cantidadVueltas');
        const cantidadFalta = document.getElementById('cantidadFalta');
        
        if (!vueltasInfo || !faltaInfo || !cantidadVueltas || !cantidadFalta) return;
        
        if (pagado > 0) {
            if (diferencia >= 0) {
                // Mostrar vueltas
                cantidadVueltas.textContent = formatCOP(diferencia);
                vueltasInfo.style.display = 'block';
                faltaInfo.style.display = 'none';
            } else {
                // Mostrar lo que falta
                cantidadFalta.textContent = formatCOP(Math.abs(diferencia));
                faltaInfo.style.display = 'block';
                vueltasInfo.style.display = 'none';
            }
        } else {
            // Ocultar ambos si no hay valor
            ocultarVueltas();
        }
    }

    // Eventos para actualizar cálculos - con verificación de elementos
    setTimeout(() => {
        const conCuantoPagaInput = document.getElementById('conCuantoPaga');
        if (conCuantoPagaInput) {
            conCuantoPagaInput.oninput = calcularVueltas;
        }
        
        adicionalesInput.oninput = function() {
            actualizarTotal();
            if (conCuantoPagaInput && conCuantoPagaInput.value) {
                calcularVueltas();
            }
        };

        // Botones sugeridos para pago efectivo
        document.querySelectorAll('.btn-cop-sugerido').forEach(btn => {
            btn.onclick = function() {
                if (conCuantoPagaInput) {
                    conCuantoPagaInput.value = this.getAttribute('data-valor');
                    calcularVueltas();
                }
            };
        });
    }, 100);

    // Configurar botones del modal
    aceptarBtn.style.display = 'none';
    cancelarBtn.style.display = '';
    confirmarPagoBtn.style.display = '';
    
    confirmarPagoBtn.textContent = 'Confirmar Pago';
    confirmarPagoBtn.style.background = '#28a745';
    confirmarPagoBtn.style.color = '#fff';
    confirmarPagoBtn.id = 'btnConfirmarPago';
    
    cancelarBtn.textContent = 'Cancelar Pedido';
    cancelarBtn.style.background = '#dc3545';
    cancelarBtn.style.color = '#fff';
    cancelarBtn.id = 'btnCancelarPedido';

    modal.classList.remove('hidden');
}

// Confirmar pago
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btnConfirmarPago') {
        confirmarPago();
    }
    if (e.target && e.target.id === 'btnCancelarPedido') {
        cancelarPedido();
    }
});

function confirmarPago() {
    if (!pedidoActual) return;
    
    const adicionales = parseFloat(adicionalesInput.value) || 0;
    const metodo_pago = metodoPagoInput.value;
    const valorTamales = pedidoActual.valor_tamales || 0;
    const total = valorTamales + adicionales;
    let pagado = 0;
    let vueltas = 0;
    
    if (metodo_pago === 'efectivo') {
        pagado = parseFloat(document.getElementById('conCuantoPaga').value) || 0;
        if (pagado < total) {
            alert('El valor pagado es menor al total requerido.');
            return;
        }
        vueltas = pagado - total;
    }
    
    const registroVenta = {
        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        descripcion: `Masa Cerdo: ${pedidoActual.tamales.masa_cerdo}, Masa Pollo: ${pedidoActual.tamales.masa_pollo}, Arroz Pollo: ${pedidoActual.tamales.arroz_pollo}, Arroz Cerdo: ${pedidoActual.tamales.arroz_cerdo}`,
        total_tamales: pedidoActual.total_tamales,
        valor_tamales: valorTamales,
        adicionales: adicionales,
        modalidad: pedidoActual.modalidad,
        metodo_pago: metodo_pago,
        pagado: metodo_pago === 'efectivo' ? pagado : total,
        vueltas: metodo_pago === 'efectivo' ? vueltas : 0,
        cliente: pedidoActual.cliente || '',
        mesa: pedidoActual.mesa || '',
        timestamp: Date.now()
    };
    
    // Guardar en ventas Y eliminar de pedidos
    const mes = getMes();
    const ventasRef = firebase.database().ref('ventas/' + mes);
    
    ventasRef.push(registroVenta).then(() => {
        // Eliminar el pedido completamente
        if (pedidoActualRef) {
            pedidoActualRef.remove();
        }
        modal.classList.add('hidden');
        mostrarModalPagoConfirmado(registroVenta);
    }).catch(() => {
        alert('Error al procesar el pago. Intente de nuevo.');
    });
}

function cancelarPedido() {
    if (confirm('¿Está seguro de cancelar este pedido?')) {
        if (pedidoActualRef) {
            pedidoActualRef.remove();
        }
        modal.classList.add('hidden');
        mostrarModalPedidoCancelado();
    }
}

function mostrarModalPagoConfirmado(venta) {
    let modalConfirm = document.getElementById('modalPagoConfirmado');
    if (!modalConfirm) {
        modalConfirm = document.createElement('div');
        modalConfirm.id = 'modalPagoConfirmado';
        modalConfirm.className = 'modal';
        modalConfirm.innerHTML = `
            <div class="modal-content" style="text-align:center;max-width:400px;">
                <h2 style="color:#28a745;margin-bottom:1rem;">✅ ¡Pago Confirmado!</h2>
                <div id="detalleVenta" style="background:#f8f9fa;padding:1rem;border-radius:8px;margin:1rem 0;text-align:left;"></div>
                <button id="cerrarModalPagoConfirmado" class="main-btn" style="background:#007bff;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modalConfirm);
    }
    
    // Mostrar detalles de la venta
    const clienteInfo = venta.modalidad === 'local' ? `Mesa ${venta.mesa}` : `${venta.cliente} (Domicilio)`;
    const total = (venta.valor_tamales || 0) + (venta.adicionales || 0);
    
    document.getElementById('detalleVenta').innerHTML = `
        <div><strong>Cliente:</strong> ${clienteInfo}</div>
        <div><strong>Total:</strong> $${total.toLocaleString('es-CO')}</div>
        <div><strong>Método:</strong> ${venta.metodo_pago}</div>
        ${venta.metodo_pago === 'efectivo' ? `<div><strong>Pagó:</strong> $${(venta.pagado || 0).toLocaleString('es-CO')}</div>` : ''}
        ${venta.metodo_pago === 'efectivo' ? `<div><strong>Vueltas:</strong> $${(venta.vueltas || 0).toLocaleString('es-CO')}</div>` : ''}
    `;
    
    modalConfirm.classList.remove('hidden');
    document.getElementById('cerrarModalPagoConfirmado').onclick = function() {
        modalConfirm.classList.add('hidden');
    };
    
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        if (!modalConfirm.classList.contains('hidden')) {
            modalConfirm.classList.add('hidden');
        }
    }, 3000);
}

// Función para inicializar elementos faltantes del DOM
function inicializarElementosDOM() {
    // Agregar funcionalidad para descargar si el botón existe
    const btnDescargar = document.getElementById('descargarPedidos');
    if (btnDescargar) {
        btnDescargar.onclick = function() {
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
    }
    
    // Agregar funcionalidad para crear pedido si el botón existe
    if (mostrarCrearPedidoBtn) {
        mostrarCrearPedidoBtn.onclick = function() {
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
                            <fieldset>
                                <legend>Tamales (cantidad):</legend>
                                <label>Masa Cerdo: <input type="number" min="0" id="masa_cerdoCajaModal" value="0"></label>
                                <label>Masa Pollo: <input type="number" min="0" id="masa_polloCajaModal" value="0"></label>
                                <label>Arroz Pollo: <input type="number" min="0" id="arroz_polloCajaModal" value="0"></label>
                                <label>Arroz Cerdo: <input type="number" min="0" id="arroz_cerdoCajaModal" value="0"></label>
                            </fieldset>
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
                    const masa_cerdo = parseInt(document.getElementById('masa_cerdoCajaModal').value, 10) || 0;
                    const masa_pollo = parseInt(document.getElementById('masa_polloCajaModal').value, 10) || 0;
                    const arroz_pollo = parseInt(document.getElementById('arroz_polloCajaModal').value, 10) || 0;
                    const arroz_cerdo = parseInt(document.getElementById('arroz_cerdoCajaModal').value, 10) || 0;

                    const total_tamales = masa_cerdo + masa_pollo + arroz_pollo + arroz_cerdo;
                    const valor_tamales = total_tamales * 10000;

                    if (!cliente || total_tamales === 0) {
                        alert('Por favor complete todos los campos y agregue al menos un tamal.');
                        return;
                    }

                    const pedido = {
                        cliente,
                        mesa: '',
                        tamales: {
                            masa_cerdo,
                            masa_pollo,
                            arroz_pollo,
                            arroz_cerdo
                        },
                        total_tamales,
                        valor_tamales,
                        modalidad: 'domicilio',
                        estado: 'aceptado', // Pedidos de caja van directo a aceptado
                        origen: 'caja',
                        timestamp: Date.now()
                    };

                    const fecha = new Date();
                    const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
                    firebase.database().ref('pedidos/' + mes).push(pedido)
                        .then(() => {
                            const confirmacion = document.getElementById('confirmacionCajaModal');
                            confirmacion.textContent = '¡Pedido creado!';
                            confirmacion.classList.remove('hidden');
                            this.reset();
                            setTimeout(() => {
                                confirmacion.classList.add('hidden');
                                modalCrear.classList.add('hidden');
                            }, 1500);
                        })
                        .catch(() => {
                            alert('Error al crear el pedido. Intente de nuevo.');
                        });
                };
            }
            modalCrear.classList.remove('hidden');
        };
    }
}

// Botones de cerrar modal
cerrarModal.onclick = function() {
    modal.classList.add('hidden');
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el botón de notificaciones
    const btnNotificaciones = document.getElementById('btnNotificacionesCaja');
    if (btnNotificaciones) {
        btnNotificaciones.addEventListener('click', function() {
            mostrarSiguientePedidoPendiente();
        });
    }
    
    // Inicializar elementos adicionales del DOM
    inicializarElementosDOM();
    
    // Inicializar la lista de pedidos
    renderPedidos();
});
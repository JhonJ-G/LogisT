document.addEventListener('DOMContentLoaded', function() {
    const modalidadSelect = document.getElementById('modalidad');
    const grupoCliente = document.getElementById('grupoCliente');
    const grupoMesa = document.getElementById('grupoMesa');
    const clienteInput = document.getElementById('cliente');
    const mesaSelect = document.getElementById('mesa');
    
    function toggleModalidad() {
        if (modalidadSelect.value === 'domicilio') {
            grupoCliente.style.display = 'block';
            grupoMesa.style.display = 'none';
            clienteInput.required = true;
            mesaSelect.required = false;
            mesaSelect.value = '';
        } else {
            grupoCliente.style.display = 'none';
            grupoMesa.style.display = 'block';
            clienteInput.required = false;
            mesaSelect.required = true;
            clienteInput.value = '';
        }
    }
    
    modalidadSelect.addEventListener('change', toggleModalidad);
    toggleModalidad(); // Inicializar
});

// Envío de pedido
document.getElementById('pedidoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const modalidad = document.getElementById('modalidad').value;
    let cliente = '';
    let mesa = '';
    
    if (modalidad === 'domicilio') {
        cliente = document.getElementById('cliente').value.trim();
    } else {
        mesa = document.getElementById('mesa').value;
    }
    
    const masa_cerdo = parseInt(document.getElementById('masa_cerdo').value, 10) || 0;
    const masa_pollo = parseInt(document.getElementById('masa_pollo').value, 10) || 0;
    const arroz_pollo = parseInt(document.getElementById('arroz_pollo').value, 10) || 0;
    const arroz_cerdo = parseInt(document.getElementById('arroz_cerdo').value, 10) || 0;

    const total_tamales = masa_cerdo + masa_pollo + arroz_pollo + arroz_cerdo;
    const valor_tamales = total_tamales * 10000;

    // Validación correcta según modalidad
    if ((modalidad === 'domicilio' && !cliente) || (modalidad === 'local' && !mesa) || total_tamales === 0) {
        alert('Por favor complete todos los campos y agregue al menos un tamal.');
        return;
    }

    const pedido = {
        cliente: modalidad === 'domicilio' ? cliente : '',
        mesa: modalidad === 'local' ? mesa : '',
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
        origen: 'mesero',
        timestamp: Date.now()
    };

    const mes = getMes();
    firebase.database().ref('pedidos/' + mes).push(pedido)
        .then(ref => {
            if (ref && ref.key) {
                let pedidosEnviados = JSON.parse(localStorage.getItem('pedidosEnviados') || '[]');
                pedidosEnviados.push(ref.key);
                localStorage.setItem('pedidosEnviados', JSON.stringify(pedidosEnviados));
            }
            document.getElementById('confirmacion').textContent = '¡Pedido enviado!';
            document.getElementById('confirmacion').classList.remove('hidden');
            document.getElementById('pedidoForm').reset();
            setTimeout(() => {
                document.getElementById('confirmacion').classList.add('hidden');
            }, 2000);
            // Reinicializar modalidad
            toggleModalidad();
        })
        .catch(() => {
        });
});

// Modal de notificación para el mesero
function mostrarModalNotificacion(mensaje) {
    let modal = document.getElementById('modalNotificacionMesero');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalNotificacionMesero';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:350px;text-align:center;">
                <div id="mensajeNotificacionMesero" style="margin-bottom:1.2rem;"></div>
                <button id="cerrarModalNotificacionMesero" class="main-btn" style="background:#007bff;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cerrarModalNotificacionMesero').onclick = function() {
            modal.classList.add('hidden');
        };
    }
    document.getElementById('mensajeNotificacionMesero').innerHTML = mensaje;
    modal.classList.remove('hidden');
}

// Notificaciones cuando caja acepta/cancela pedidos
(function() {
    const mes = getMes();
    const pedidosRef = firebase.database().ref('pedidos/' + mes);

    pedidosRef.on('child_changed', function(snapshot) {
        const pedido = snapshot.val();
        const id = snapshot.key;
        
        if (pedido.origen !== 'mesero') return;

        // Solo para pedidos que fueron enviados por este mesero
        const pedidosEnviados = JSON.parse(localStorage.getItem('pedidosEnviados') || '[]');
        if (!pedidosEnviados.includes(id)) return;

        // SOLO notificar cuando cambia de "pendiente" a "aceptado"
        if (pedido.estado === 'aceptado') {
            const detallesTamales = `${pedido.tamales.masa_cerdo} Masa Cerdo, ${pedido.tamales.masa_pollo} Masa Pollo, ${pedido.tamales.arroz_pollo} Arroz Pollo, ${pedido.tamales.arroz_cerdo} Arroz Cerdo`;
            const clienteInfo = pedido.modalidad === 'local' 
                ? `Mesa <b>${pedido.mesa}</b>`
                : `Cliente <b>${pedido.cliente}</b> (Domicilio)`;
                
            const mensaje = `
                <div style="color:#43a047;font-weight:bold;">✅ PEDIDO ACEPTADO</div>
                <div style="margin:1rem 0;">${clienteInfo}</div>
                <div style="font-size:0.9rem;color:#666;">${detallesTamales}</div>
                <div style="font-size:0.9rem;color:#666;">Total: ${pedido.total_tamales} tamales - $${(pedido.valor_tamales || 0).toLocaleString('es-CO')}</div>
            `;
            mostrarModalNotificacion(mensaje);
        }
    });

    pedidosRef.on('child_removed', function(snapshot) {
        const pedido = snapshot.val();
        const id = snapshot.key;
        
        if (pedido.origen !== 'mesero') return;
        
        // Solo para pedidos que fueron enviados por este mesero
        const pedidosEnviados = JSON.parse(localStorage.getItem('pedidosEnviados') || '[]');
        if (!pedidosEnviados.includes(id)) {
            return;
        }

        // SOLO notificar si el pedido fue cancelado cuando estaba en estado "pendiente"
        // (no cuando ya estaba aceptado y se cancela desde gestión de pago)
        if (pedido.estado === 'pendiente') {
            const detallesTamales = `${pedido.tamales.masa_cerdo} Masa Cerdo, ${pedido.tamales.masa_pollo} Masa Pollo, ${pedido.tamales.arroz_pollo} Arroz Pollo, ${pedido.tamales.arroz_cerdo} Arroz Cerdo`;
            const clienteInfo = pedido.modalidad === 'local' 
                ? `Mesa <b>${pedido.mesa}</b>`
                : `Cliente <b>${pedido.cliente}</b> (Domicilio)`;
                
            const mensaje = `
                <div style="color:#e53935;font-weight:bold;">❌ PEDIDO CANCELADO</div>
                <div style="margin:1rem 0;">${clienteInfo}</div>
                <div style="font-size:0.9rem;color:#666;">${detallesTamales}</div>
                <div style="font-size:0.9rem;color:#666;">Total: ${pedido.total_tamales} tamales - $${(pedido.valor_tamales || 0).toLocaleString('es-CO')}</div>
            `;
            mostrarModalNotificacion(mensaje);
        }
        
        // Remover de la lista de pedidos enviados
        let pedidosEnviadosActualizados = JSON.parse(localStorage.getItem('pedidosEnviados') || '[]');
        pedidosEnviadosActualizados = pedidosEnviadosActualizados.filter(pid => pid !== id);
        localStorage.setItem('pedidosEnviados', JSON.stringify(pedidosEnviadosActualizados));
    });
})();

function getMes() {
    const fecha = new Date();
    return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
}

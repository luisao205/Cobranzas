// scripts.js - Usando Firebase v8 (sintaxis tradicional)

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC09IXmvn-P2TjOKaCSOBKK4D5515NE5T0",
  authDomain: "sistemaprestamos-397a9.firebaseapp.com",
  projectId: "sistemaprestamos-397a9",
  storageBucket: "sistemaprestamos-397a9.appspot.com", // Corregido el formato del bucket
  messagingSenderId: "95115496711",
  appId: "1:95115496711:web:485fbd7b84de775f3009a2",
  measurementId: "G-1E513QFXC5"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const clientesRef = db.collection('clientes');

// Función para cargar los clientes desde Firebase
async function loadClientsFromFirebase() {
  try {
    const snapshot = await clientesRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    return [];
  }
}

// Identificar la página actual basada en la URL
function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop();
  return page;
}

// Función para cargar los clientes en la tabla
async function loadClients() {
  const clientList = document.getElementById("client-list");
  if (!clientList) return; // Salir si no estamos en la página correcta
  
  try {
    const clients = await loadClientsFromFirebase();
    
    clientList.innerHTML = ""; // Limpiar la lista actual
    clients.forEach((client) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${client.name}</td>
          <td>${client.cedula}</td>
          <td>${client.phone}</td>
          <td>$${client.loanAmount ? client.loanAmount.toFixed(2) : '0.00'}</td>
          <td>$${client.balance ? client.balance.toFixed(2) : '0.00'}</td>
          <td>
              <button onclick="openAbonoModal('${client.id}')">Abonar</button>
              <button onclick="window.location.href='perfil-cliente.html?id=${client.id}'">Ver Perfil</button>
              <button onclick="deleteClient('${client.id}')">Eliminar</button>
          </td>
      `;
      clientList.appendChild(row);
    });
  } catch (error) {
    console.error("Error al mostrar clientes:", error);
    clientList.innerHTML = "<tr><td colspan='6'>Error al cargar clientes</td></tr>";
  }
}

// Función para abrir el modal de abono
function openAbonoModal(clientId) {
  const modal = document.getElementById("modal-abono");
  if (!modal) {
      console.error("Modal no encontrado");
      return;
  }
  
  const closeModal = document.getElementById("close-modal");
  const saveAbonoButton = document.getElementById("save-abono");
  const amountInput = document.getElementById("amount");

  // Guardar ID del cliente en el modal para usarlo al guardar
  modal.dataset.clientId = clientId;
  
  modal.style.display = "flex"; // Asegurarse de que se muestre como flex
  modal.style.opacity = 1;  // Mostrar el modal con la transición de opacidad

  // Guardar abono
  saveAbonoButton.onclick = async () => {
      const abonoAmount = parseFloat(amountInput.value);
      if (isNaN(abonoAmount) || abonoAmount <= 0) {
          alert("Por favor, ingresa un monto válido.");
          return;
      }

      try {
          // Obtener cliente actual
          const clientDocRef = db.doc(`clientes/${clientId}`);
          const clientSnap = await clientDocRef.get();
          const clientData = clientSnap.data();
          const newBalance = (clientData.balance || 0) - abonoAmount;

          // Actualizar balance
          await clientDocRef.update({
              balance: newBalance,
              lastPayment: firebase.firestore.FieldValue.serverTimestamp()
          });

          // Registrar el abono en una subcolección
          const abonosRef = db.collection(`clientes/${clientId}/abonos`);
          await abonosRef.add({
              amount: abonoAmount,
              date: firebase.firestore.FieldValue.serverTimestamp()
          });

          alert(`Abono de ${abonoAmount} registrado correctamente.`);
          loadClients(); // Recargar la lista de clientes
          if (getCurrentPage() === 'index.html' || getCurrentPage() === '') {
              loadFeaturedClient(); // Actualizar cliente destacado en la página de inicio
          } else if (getCurrentPage() === 'perfil-cliente.html') {
              loadClientProfile(clientId); // Actualizar perfil del cliente
          }
          modal.style.display = "none"; // Cerrar el modal
          amountInput.value = ""; // Limpiar el input
      } catch (error) {
          console.error("Error al registrar abono:", error);
          alert("Hubo un error al registrar el abono. Intente nuevamente.");
      }
  };

  // Cerrar modal
  closeModal.onclick = () => {
      modal.style.display = "none";
      amountInput.value = "";
  };
  
  // Cerrar modal al hacer clic fuera de él
  window.onclick = function(event) {
      if (event.target === modal) {
          modal.style.display = "none";
          amountInput.value = "";
      }
  };
}

// Función para eliminar un cliente
async function deleteClient(clientId) {
  if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
    try {
      // Eliminar los abonos del cliente
      const abonosRef = db.collection(`clientes/${clientId}/abonos`);
      const abonosSnapshot = await abonosRef.get();
      
      // Eliminar cada abono individualmente
      const batchDeletes = [];
      abonosSnapshot.docs.forEach(doc => {
        batchDeletes.push(abonosRef.doc(doc.id).delete());
      });
      
      // Esperar a que se eliminen todos los abonos
      await Promise.all(batchDeletes);
      
      // Luego eliminar el cliente
      await db.doc(`clientes/${clientId}`).delete();
      
      alert("Cliente eliminado correctamente");
      loadClients(); // Recargar la lista de clientes
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      alert("Hubo un error al eliminar el cliente. Intente nuevamente.");
    }
  }
}

// Función de búsqueda en tiempo real
async function searchInRealTime(searchQuery) {
  if (!searchQuery) {
    document.querySelector(".search-results").innerHTML = "";
    return;
  }
  
  searchQuery = searchQuery.toLowerCase();
  
  try {
    // En una aplicación real, usaríamos índices y consultas más eficientes
    const snapshot = await clientesRef.get();
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const searchResults = clients.filter(client => 
      client.name?.toLowerCase().includes(searchQuery) || 
      client.cedula?.includes(searchQuery)
    );

    const resultsContainer = document.querySelector(".search-results");
    resultsContainer.innerHTML = ""; // Limpiar resultados previos

    if (searchResults.length > 0) {
      searchResults.forEach(client => {
        const clientDiv = document.createElement("div");
        clientDiv.innerHTML = `
          <p><strong>${client.name}</strong> (${client.cedula})</p>
          <p>Teléfono: ${client.phone}</p>
          <p>Préstamo: $${client.loanAmount ? client.loanAmount.toFixed(2) : '0.00'}</p>
          <p>Saldo Pendiente: $${client.balance ? client.balance.toFixed(2) : '0.00'}</p>
          <p>Cuota: $${client.paymentAmount ? client.paymentAmount.toFixed(2) : '0.00'}</p>
          <button onclick="window.location.href='perfil-cliente.html?id=${client.id}'">Ver detalles</button>
        `;
        resultsContainer.appendChild(clientDiv);
      });
    } else {
      resultsContainer.innerHTML = "<p>No se encontraron resultados.</p>";
    }
  } catch (error) {
    console.error("Error al buscar clientes:", error);
    document.querySelector(".search-results").innerHTML = "<p>Error en la búsqueda</p>";
  }
}

// Inicializar la página según su tipo  
async function initPage() {
  const currentPage = getCurrentPage();
  
  // Lista de todos los clientes
  if (currentPage === 'tlclientes.html') {
    await loadClients();
  }
  
  // Agregar nuevo cliente
  else if (currentPage === 'ncliente.html') {
    const form = document.querySelector("form");
    if (form) {
      form.addEventListener("submit", async function(event) {
        event.preventDefault(); // Evitar el envío del formulario

        const name = document.getElementById("name").value;
        const cedula = document.getElementById("cedula").value;
        const phone = document.getElementById("phone").value;
        const email = document.getElementById("email").value;
        const address = document.getElementById("address").value;
        const loanAmount = parseFloat(document.getElementById("loanAmount").value);
        const paymentAmount = parseFloat(document.getElementById("paymentAmount").value);

        // Validar campos
        if (!name) {
          alert("Por favor, llena todos los campos.");
          return;
        }

        if (isNaN(loanAmount) || loanAmount <= 0) {
          alert("Por favor, ingresa un monto de préstamo válido.");
          return;
        }

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          alert("Por favor, ingresa una cuota válida.");
          return;
        }

        try {
          // Verificar si ya existe un cliente con esa cédula
          const cedulaQuery = clientesRef.where('cedula', '==', cedula);
          const cedulaSnapshot = await cedulaQuery.get();
          
          if (!cedulaSnapshot.empty) {
            alert("Ya existe un cliente con esta cédula. Por favor verifica.");
            return;
          }
          
          // Agregar cliente a Firebase
          await clientesRef.add({
            name,
            cedula,
            phone,
            email,
            address,
            loanAmount, // Nuevo campo: monto prestado
            paymentAmount, // Nuevo campo: cuota a pagar
            balance: loanAmount, // Inicializar balance con el monto prestado
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          alert("Cliente agregado correctamente.");
          form.reset();
          window.location.href = "index.html"; // Redirigir al inicio
        } catch (error) {
          console.error("Error al agregar cliente:", error);
          alert("Hubo un error al registrar el cliente. Intente nuevamente.");
        }
      });
    }
  }
  
  // Buscar cliente
  else if (currentPage === 'bcliente.html') {
    const searchInput = document.getElementById("search");
    if (searchInput) {
      // Evento para buscar en tiempo real mientras escribe
      searchInput.addEventListener("input", function() {
        searchInRealTime(this.value);
      });
      
      // También mantener el evento submit para compatibilidad
      const form = document.querySelector("form");
      if (form) {
        form.addEventListener("submit", function(event) {
          event.preventDefault();
          searchInRealTime(searchInput.value);
        });
      }
    }
  }
  
  // Ver recaudado por fecha
  else if (currentPage === 'rpfecha.html') {
    const form = document.querySelector("form");
    if (form) {
      form.addEventListener("submit", async function(event) {
        event.preventDefault(); // Evitar el envío del formulario

        const startDate = new Date(document.getElementById("start-date").value);
        const endDate = new Date(document.getElementById("end-date").value);
        endDate.setHours(23, 59, 59, 999); // Establecer al final del día

        if (isNaN(startDate) || isNaN(endDate)) {
          alert("Por favor, ingresa fechas válidas.");
          return;
        }

        try {
          // Obtener todos los abonos en todas las subcollecciones de clientes
          // Nota: En aplicaciones reales, necesitaríamos un enfoque más escalable
          const clientSnapshot = await clientesRef.get();
          let totalRecaudado = 0;
          const pagos = [];
          
          // Para cada cliente, obtener sus abonos
          const clientPromises = clientSnapshot.docs.map(async clientDoc => {
            const clientId = clientDoc.id;
            const clientData = clientDoc.data();
            const abonosRef = db.collection(`clientes/${clientId}/abonos`);
            
            // Tener en cuenta que la consulta por fecha puede no funcionar como esperado
            // debido a diferencias de formato, pero se podría filtrar después de obtener los datos
            const abonosSnapshot = await abonosRef.get();
            
            abonosSnapshot.docs.forEach(abonoDoc => {
              const abonoData = abonoDoc.data();
              const abonoDate = abonoData.date?.toDate();
              
              // Filtrar por fechas manualmente
              if (abonoData.amount && abonoDate && 
                  abonoDate >= startDate && abonoDate <= endDate) {
                totalRecaudado += abonoData.amount;
                pagos.push({
                  clientName: clientData.name,
                  clientId: clientId,
                  amount: abonoData.amount,
                  date: abonoDate
                });
              }
            });
          });
          
          await Promise.all(clientPromises);
          
          const recaudoResults = document.querySelector(".recaudado-results");
          recaudoResults.innerHTML = ""; // Limpiar resultados previos

          if (pagos.length > 0) {
            // Mostrar el total recaudado
            const totalDiv = document.createElement("div");
            totalDiv.innerHTML = `<h3>Total recaudado: $${totalRecaudado.toFixed(2)}</h3>`;
            totalDiv.className = "total-recaudado";
            recaudoResults.appendChild(totalDiv);
            
            // Mostrar cada pago individual
            pagos.sort((a, b) => b.date - a.date); // Ordenar por fecha descendente
            
            pagos.forEach(pago => {
              const resultDiv = document.createElement("div");
              resultDiv.innerHTML = `
                <p><strong>${pago.clientName}</strong>: $${pago.amount.toFixed(2)}</p>
                <p class="fecha-pago">Fecha: ${pago.date.toLocaleDateString()}</p>
              `;
              recaudoResults.appendChild(resultDiv);
            });
          } else {
            recaudoResults.innerHTML = "<p>No se encontraron pagos para este período.</p>";
          }
        } catch (error) {
          console.error("Error al buscar recaudos:", error);
          document.querySelector(".recaudado-results").innerHTML = 
            "<p>Error al buscar los datos de recaudación</p>";
        }
      });
    }
  }
  
  // Página de inicio - actualizamos datos de los cards
  else if (currentPage === 'index.html' || currentPage === '') {
    try {
      // Contar total de clientes
      const clientesSnapshot = await clientesRef.get();
      const totalClientes = clientesSnapshot.size;
      document.querySelector('.card:nth-child(1) p').textContent = totalClientes;
      
      // Calcular recaudado hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      let recaudadoHoy = 0;
      
      // Esto es ineficiente para bases de datos grandes, pero sirve como ejemplo
      const clientPromises = clientesSnapshot.docs.map(async clientDoc => {
        const clientId = clientDoc.id;
        const abonosRef = db.collection(`clientes/${clientId}/abonos`);
        const abonosSnapshot = await abonosRef.get();
          
        abonosSnapshot.docs.forEach(abonoDoc => {
          const abonoData = abonoDoc.data();
          const abonoDate = abonoData.date?.toDate();
          
          // Verificar si el abono es de hoy
          if (abonoData.amount && abonoDate && 
              abonoDate >= hoy) {
            recaudadoHoy += abonoData.amount;
          }
        });
      });
      
      await Promise.all(clientPromises);
      document.querySelector('.card:nth-child(2) p').textContent = `$${recaudadoHoy.toFixed(2)}`;
      
      // Contar préstamos activos (clientes con balance > 0)
      let prestamosActivos = 0;
      clientesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.balance > 0) {
          prestamosActivos++;
        }
      });
      document.querySelector('.card:nth-child(3) p').textContent = prestamosActivos;
      
      // Cargar cliente destacado
      loadFeaturedClient();
      
      // Configurar botón de actualizar cliente destacado
      document.getElementById('refresh-client').addEventListener('click', loadFeaturedClient);
      
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error);
    }
  }
  
  // Código para la página de perfil del cliente
  else if (currentPage === 'perfil-cliente.html') {
    // Obtener ID del cliente de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    
    if (clientId) {
      // Cargar datos del cliente
      loadClientProfile(clientId);
      
      // Configurar botones
      document.getElementById('btn-abonar').addEventListener('click', function() {
        openAbonoModal(clientId);
      });
      
      document.getElementById('btn-editar').addEventListener('click', function() {
        // Ver si existe el archivo de edición, si no, hacer la edición aquí mismo
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', 'editar-cliente.html', false);
        try {
          xhr.send();
          if (xhr.status === 200) {
            // Si existe la página de edición, redirigir
            window.location.href = `editar-cliente.html?id=${clientId}`;
          } else {
            // Si no existe, mostrar un mensaje
            alert("La función de edición no está disponible en este momento.");
          }
        } catch (e) {
          // Si hay un error, mostrar un mensaje
          alert("La función de edición no está disponible en este momento.");
        }
      });
    } else {
      document.getElementById('cliente-info').innerHTML = 
        '<p>Error: No se especificó un cliente</p>';
    }
  }
  
  // Controlador para la página de editar cliente (si se crea en el futuro)
  else if (currentPage === 'editar-cliente.html') {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    
    if (!clientId) {
      alert("No se especificó un cliente para editar");
      window.location.href = "index.html";
      return;
    }
    
    try {
      const clientDocRef = db.doc(`clientes/${clientId}`);
      const clientSnap = await clientDocRef.get();
      
      if (!clientSnap.exists) {
        alert("Cliente no encontrado");
        window.location.href = "index.html";
        return;
      }
      
      const clientData = clientSnap.data();
      
      // Rellenar el formulario con los datos del cliente
      document.getElementById('name').value = clientData.name || '';
      document.getElementById('cedula').value = clientData.cedula || '';
      document.getElementById('phone').value = clientData.phone || '';
      document.getElementById('email').value = clientData.email || '';
      document.getElementById('address').value = clientData.address || '';
      document.getElementById('loanAmount').value = clientData.loanAmount || 0;
      document.getElementById('paymentAmount').value = clientData.paymentAmount || 0;
      
      // Manejar el formulario de edición
      const form = document.querySelector("form");
      if (form) {
        form.addEventListener("submit", async function(event) {
          event.preventDefault();
          
          // Obtener valores actualizados
          const updatedName = document.getElementById('name').value;
          const updatedCedula = document.getElementById('cedula').value;
          const updatedPhone = document.getElementById('phone').value;
          const updatedEmail = document.getElementById('email').value;
          const updatedAddress = document.getElementById('address').value;
          const updatedLoanAmount = parseFloat(document.getElementById('loanAmount').value);
          const updatedPaymentAmount = parseFloat(document.getElementById('paymentAmount').value);
          
          // Validar campos
          if (!updatedName || !updatedCedula || !updatedPhone || !updatedEmail || !updatedAddress) {
            alert("Por favor, llena todos los campos.");
            return;
          }
          
          if (isNaN(updatedLoanAmount) || updatedLoanAmount <= 0) {
            alert("Por favor, ingresa un monto de préstamo válido.");
            return;
          }
          
          if (isNaN(updatedPaymentAmount) || updatedPaymentAmount <= 0) {
            alert("Por favor, ingresa una cuota válida.");
            return;
          }
          
          try {
            // Verificar si ya existe otro cliente con esa cédula (que no sea el mismo)
            if (updatedCedula !== clientData.cedula) {
              const cedulaQuery = clientesRef.where('cedula', '==', updatedCedula);
              const cedulaSnapshot = await cedulaQuery.get();
              
              if (!cedulaSnapshot.empty) {
                alert("Ya existe otro cliente con esta cédula. Por favor verifica.");
                return;
              }
            }
            
            // Si el monto del préstamo cambió, ajustar el balance
            let newBalance = clientData.balance || 0;
            if (updatedLoanAmount !== clientData.loanAmount) {
              // Calcular cuánto ya ha pagado el cliente
              const pagado = clientData.loanAmount - clientData.balance;
              // El nuevo balance es el nuevo monto menos lo ya pagado
              newBalance = updatedLoanAmount - pagado;
            }
            
            // Actualizar cliente
            await clientDocRef.update({
              name: updatedName,
              cedula: updatedCedula,
              phone: updatedPhone,
              email: updatedEmail,
              address: updatedAddress,
              loanAmount: updatedLoanAmount,
              paymentAmount: updatedPaymentAmount,
              balance: newBalance,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert("Cliente actualizado correctamente");
            window.location.href = `perfil-cliente.html?id=${clientId}`;
          } catch (error) {
            console.error("Error al actualizar cliente:", error);
            alert("Error al actualizar cliente. Intente nuevamente.");
          }
        });
      }
    } catch (error) {
      console.error("Error al cargar cliente para editar:", error);
      alert("Error al cargar la información del cliente");
      window.location.href = "index.html";
    }
  }
}

// Función para cargar el perfil del cliente
async function loadClientProfile(clientId) {
  try {
    const clientDocRef = db.doc(`clientes/${clientId}`);
    const clientSnap = await clientDocRef.get();
    
    if (!clientSnap.exists) {
      document.getElementById('cliente-info').innerHTML = 
        '<p>Error: Cliente no encontrado</p>';
      return;
    }
    
    const clientData = clientSnap.data();
    
    // Mostrar información del cliente solo si tiene datos
    const clienteInfo = document.getElementById('cliente-info');
    let clienteInfoHTML = `
      <h2>${clientData.name}</h2>
      <div class="cliente-detalles">
        <p><strong>Cédula:</strong> ${clientData.cedula || 'Información no disponible'}</p>
        <p><strong>Balance actual:</strong> $${clientData.balance || 0}</p>
    `;

    // Solo mostrar Teléfono si tiene valor
    if (clientData.phone) {
      clienteInfoHTML += `<p><strong>Teléfono:</strong> ${clientData.phone}</p>`;
    }

    // Solo mostrar Email si tiene valor
    if (clientData.email) {
      clienteInfoHTML += `<p><strong>Email:</strong> ${clientData.email}</p>`;
    }

    // Solo mostrar Dirección si tiene valor
    if (clientData.address) {
      clienteInfoHTML += `<p><strong>Dirección:</strong> ${clientData.address}</p>`;
    }

    // Cerrar el div de detalles
    clienteInfoHTML += `</div>`;
    
    // Actualizar el HTML con la información del cliente
    clienteInfo.innerHTML = clienteInfoHTML;

    // Cargar historial de pagos
    loadPaymentHistory(clientId);

  } catch (error) {
    console.error("Error al cargar perfil:", error);
    document.getElementById('cliente-info').innerHTML = 
      '<p>Error al cargar información del cliente</p>';
  }
}

// Función para cargar historial de pagos
async function loadPaymentHistory(clientId) {
  const historialPagos = document.getElementById('historial-pagos');
  try {
    const abonosRef = db.collection(`clientes/${clientId}/abonos`).orderBy('date', 'desc');
    const abonosSnapshot = await abonosRef.get();
    
    if (abonosSnapshot.empty) {
      historialPagos.innerHTML = '<p>No hay pagos registrados</p>';
      return;
    }

    let historialHTML = '<ul class="lista-pagos">';

    abonosSnapshot.forEach(doc => {
      const abonoData = doc.data();
      const fecha = abonoData.date ? abonoData.date.toDate().toLocaleDateString() : 'Fecha desconocida';

      // Añadir el emoji ✅ al principio de cada pago
      historialHTML += `
        <li>
          <span class="emoji">✅</span> <!-- Emoji de pago -->
          <span class="fecha">${fecha}</span> - 
          <span class="monto">$${abonoData.amount}</span>
        </li>
      `;
    });

    historialHTML += '</ul>';
    historialPagos.innerHTML = historialHTML;

  } catch (error) {
    console.error("Error al cargar el historial de pagos:", error);
    historialPagos.innerHTML = "<p>Error al cargar el historial de pagos</p>";
  }
}

// Función para cargar cliente destacado (en la página de inicio)
async function loadFeaturedClient() {
  const featuredClientContainer = document.getElementById('featured-client-container');
  
  try {
    // Obtener un cliente aleatorio o el más reciente con préstamo activo
    const clientesActivosQuery = clientesRef.where('balance', '>', 0).limit(5);
    const snapshot = await clientesActivosQuery.get();
    
    if (snapshot.empty) {
      featuredClientContainer.innerHTML = `
        <div class="no-client">
          No hay clientes con préstamos activos
        </div>`;
      return;
    }
    
    // Seleccionar un cliente aleatoriamente entre los obtenidos
    const clients = snapshot.docs;
    const randomIndex = Math.floor(Math.random() * clients.length);
    const clientDoc = clients[randomIndex];
    const clientData = clientDoc.data();
    const clientId = clientDoc.id;
    
    // Mostrar su información en el contenedor
    featuredClientContainer.innerHTML = `
      <div class="client-info">
        <div class="client-details">
          <div class="client-property">
            <span class="property-label">Nombre:</span>
            <span class="property-value">${clientData.name}</span>
          </div>
          <div class="client-property">
            <span class="property-label">Cédula:</span>
            <span class="property-value">${clientData.cedula}</span>
          </div>
          <div class="client-property">
            <span class="property-label">Teléfono:</span>
            <span class="property-value">${clientData.phone}</span>
          </div>
          <div class="client-property">
            <span class="property-label">Balance:</span>
            <span class="property-value">$${clientData.balance.toFixed(2)}</span>
          </div>
        </div>
        <div class="client-actions">
          <a href="perfil-cliente.html?id=${clientId}" class="client-action">Ver perfil</a>
          <a href="#" class="client-action" onclick="event.preventDefault(); openAbonoModal('${clientId}')">Registrar abono</a>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error("Error al cargar cliente destacado:", error);
    featuredClientContainer.innerHTML = `
      <div class="no-client">
        Error al cargar cliente destacado
      </div>`;
  }
}

// Asegurarse de que estas funciones sean accesibles globalmente para los manejadores de eventos en línea
window.openAbonoModal = openAbonoModal;
window.deleteClient = deleteClient;
window.loadFeaturedClient = loadFeaturedClient;
window.loadClientProfile = loadClientProfile;

// Inicializar cuando el documento está listo
document.addEventListener("DOMContentLoaded", initPage);
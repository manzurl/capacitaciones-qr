const legajo = new URLSearchParams(window.location.search).get("legajo");

function excelDateToJSDate(serial) {
  const utc_days = serial - 25569;
  const utc_value = utc_days * 86400;

  const date = new Date(utc_value * 1000);

  return date.toLocaleDateString("es-AR");
}

function fechaConsulta() {
  return new Date().toLocaleString("es-AR");
}

function diasRestantes(serial) {
  const utc_days = serial - 25569;
  const utc_value = utc_days * 86400;

  const fecha = new Date(utc_value * 1000);

  const hoy = new Date();

  return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
}

function obtenerEstado(serial) {
  const dias = diasRestantes(serial);

  if (dias < 0) {
    return {
      clase: "vencido",
      texto: "🔴 Vencido",
    };
  }

  if (dias <= 30) {
    return {
      clase: "proximo",
      texto: "🟡 Próximo a vencer",
    };
  }

  return {
    clase: "vigente",
    texto: "🟢 Vigente",
  };
}

async function cargar() {
  if (!legajo) {
    document.getElementById("resultado").innerHTML = `
            <div class="card">
                <h2>Error</h2>
                <p>No se especificó ningún legajo.</p>
            </div>
        `;

    return;
  }

  const respuesta = await fetch(
    "https://defaultc0a6e65377dc41a6a0448f12d4ad64.1d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/74804848daf940c79fe30dada4878a86/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=C-P_t8mcqr-vTeOBLppGeqCD9Eii1hIyAyNxs53iTj4",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        legajo: legajo,
      }),
    }
  );

  const datos = await respuesta.json();

  let vigentes = 0;
  let proximos = 0;
  let vencidos = 0;

  datos.forEach((item) => {
    const estado = obtenerEstado(item.FechaVencimiento);

    if (estado.clase === "vigente") vigentes++;

    if (estado.clase === "proximo") proximos++;

    if (estado.clase === "vencido") vencidos++;
  });

  let html = "";

  if (datos.length === 0) {
    document.getElementById("resultado").innerHTML = `
        <div class="card">
            <h2>Legajo no encontrado</h2>
            <p>No existen capacitaciones para el legajo ${legajo}.</p>
        </div>
    `;

    return;
  }

  html += `
<div class="empleado">

    <h2>${datos[0].Nombre}</h2>

    <p>
        <strong>Legajo:</strong>
        ${datos[0].Legajo}
    </p>

    <p>
        <strong>Total de capacitaciones:</strong>
        ${datos.length}
    </p>

    <div class="resumen">

        <div class="contador verde">
            🟢 Vigentes: ${vigentes}
        </div>

        <div class="contador amarillo">
            🟡 Por vencer: ${proximos}
        </div>

        <div class="contador rojo">
            🔴 Vencidas: ${vencidos}
        </div>

    </div>

    <p class="consulta">
        Consultado: ${fechaConsulta()}
    </p>

</div>
`;

  datos.forEach((item) => {
    const estado = obtenerEstado(item.FechaVencimiento);

    let botonCredencial = "";

    if (item.CredencialURL) {
      botonCredencial = `
            <a
                href="${item.CredencialURL}"
                target="_blank"
                class="btn-credencial">

                🪪 Ver Credencial

            </a>
        `;
    }

    html += `
        <div
    class="card ${estado.clase} tarjeta-capacitacion"
    data-estado="${estado.clase}">

            <h3>${item.Capacitacion}</h3>

            ${botonCredencial}

            <p>
                <strong>Realizado:</strong>
                ${excelDateToJSDate(item.FechaRealizacion)}
            </p>

            <p>
                <strong>Vence:</strong>
                ${excelDateToJSDate(item.FechaVencimiento)}
            </p>

            <div class="estado">
                ${estado.texto}
            </div>

        </div>
    `;
  });

  document.getElementById("resultado").innerHTML = html;
  actualizarContador();
}

function actualizarContador() {
  const visibles = document.querySelectorAll(
    '.tarjeta-capacitacion:not([style*="display: none"])'
  ).length;

  const total = document.querySelectorAll(".tarjeta-capacitacion").length;

  document.getElementById(
    "contadorResultados"
  ).textContent = `Mostrando ${visibles} de ${total} capacitaciones`;
}

cargar();

document.addEventListener("input", function (e) {
  if (e.target.id !== "filtroCapacitaciones") return;

  const texto = e.target.value.toLowerCase();

  document.querySelectorAll(".tarjeta-capacitacion").forEach((tarjeta) => {
    const contenido = tarjeta.textContent.toLowerCase();

    tarjeta.style.display = contenido.includes(texto) ? "" : "none";
  });
  actualizarContador();
});

document.addEventListener("click", function (e) {
  if (!e.target.classList.contains("btn-filtro")) return;

  document
    .querySelectorAll(".btn-filtro")
    .forEach((btn) => btn.classList.remove("activo"));

  e.target.classList.add("activo");

  const filtro = e.target.dataset.filtro;

  document.querySelectorAll(".tarjeta-capacitacion").forEach((tarjeta) => {
    const estado = tarjeta.dataset.estado;

    if (filtro === "todas" || estado === filtro) {
      tarjeta.style.display = "";
    } else {
      tarjeta.style.display = "none";
    }
  });

  actualizarContador();
});

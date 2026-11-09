const config = window.FLEETMOTO_SUPABASE_CONFIG || {};
const hasConfig = config.url && config.anonKey && !config.url.includes('YOUR-') && !config.anonKey.includes('YOUR_');
let supabase = null;
const modal = window.bootstrap ? new bootstrap.Modal(document.querySelector('#record-modal')) : null;

const modules = {
    clients: {
        label: 'Clientes', table: 'clients', columns: ['name', 'tax_id', 'email', 'phone'],
        fields: [
            { name: 'name', label: 'Nome', required: true },
            { name: 'tax_id', label: 'NIF' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Telefone', type: 'tel' }
        ]
    },
    stores: {
        label: 'Lojas', table: 'stores', columns: ['client_id', 'name', 'city'],
        fields: [
            { name: 'client_id', label: 'Cliente', relation: 'clients', required: true },
            { name: 'name', label: 'Nome', required: true },
            { name: 'address', label: 'Morada' },
            { name: 'city', label: 'Localidade' }
        ]
    },
    fleets: {
        label: 'Frotas', table: 'fleets', columns: ['name', 'client_id', 'store_id'],
        fields: [
            { name: 'client_id', label: 'Cliente', relation: 'clients', required: true },
            { name: 'store_id', label: 'Loja', relation: 'stores' },
            { name: 'name', label: 'Nome da frota', required: true }
        ]
    },
    motorcycles: {
        label: 'Motociclos', table: 'motorcycles', columns: ['plate_number', 'brand', 'model', 'status', 'fleet_id'],
        fields: [
            { name: 'fleet_id', label: 'Frota', relation: 'fleets', required: true },
            { name: 'plate_number', label: 'Matrícula', required: true },
            { name: 'vin', label: 'Número de quadro' },
            { name: 'brand', label: 'Marca' },
            { name: 'model', label: 'Modelo' },
            { name: 'model_year', label: 'Ano', type: 'number' },
            { name: 'status', label: 'Estado', type: 'select', required: true, options: ['active', 'maintenance', 'inactive'] }
        ]
    },
    occurrences: {
        label: 'Ocorrências', table: 'occurrences', columns: ['title', 'motorcycle_id', 'severity', 'status', 'reported_at'],
        fields: [
            { name: 'motorcycle_id', label: 'Motociclo', relation: 'motorcycles', required: true },
            { name: 'title', label: 'Título', required: true },
            { name: 'description', label: 'Descrição', type: 'textarea' },
            { name: 'severity', label: 'Gravidade', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'] },
            { name: 'status', label: 'Estado', type: 'select', required: true, options: ['open', 'in_progress', 'resolved', 'cancelled'] },
            { name: 'latitude', label: 'Latitude', type: 'number', step: 'any' },
            { name: 'longitude', label: 'Longitude', type: 'number', step: 'any' }
        ]
    },
    technical_teams: {
        label: 'Equipas', table: 'technical_teams', columns: ['name'],
        fields: [{ name: 'name', label: 'Nome da equipa', required: true }]
    },
    team_members: {
        label: 'Membros das equipas', table: 'team_members', key: ['team_id', 'user_id'], columns: ['team_id', 'user_id'],
        fields: [
            { name: 'team_id', label: 'Equipa', relation: 'technical_teams', required: true },
            { name: 'user_id', label: 'Técnico', relation: 'profiles', required: true }
        ]
    },
    mobile_workshops: {
        label: 'Oficinas móveis', table: 'mobile_workshops', columns: ['name', 'vehicle_plate', 'active'],
        fields: [
            { name: 'name', label: 'Nome', required: true },
            { name: 'vehicle_plate', label: 'Matrícula da viatura' },
            { name: 'active', label: 'Ativa', type: 'select', required: true, options: ['true', 'false'] },
            { name: 'notes', label: 'Notas', type: 'textarea' }
        ]
    },
    rounds: {
        label: 'Rondas', table: 'rounds', columns: ['planned_date', 'team_id', 'mobile_workshop_id', 'status'],
        fields: [
            { name: 'planned_date', label: 'Data planeada', type: 'date', required: true },
            { name: 'team_id', label: 'Equipa', relation: 'technical_teams' },
            { name: 'mobile_workshop_id', label: 'Oficina móvel', relation: 'mobile_workshops' },
            { name: 'status', label: 'Estado', type: 'select', required: true, options: ['planned', 'in_progress', 'completed', 'cancelled'] },
            { name: 'notes', label: 'Notas', type: 'textarea' }
        ]
    },
    round_stops: {
        label: 'Paragens das rondas', table: 'round_stops', columns: ['round_id', 'stop_order', 'motorcycle_id', 'occurrence_id'],
        fields: [
            { name: 'round_id', label: 'Ronda', relation: 'rounds', required: true },
            { name: 'stop_order', label: 'Ordem', type: 'number', required: true },
            { name: 'motorcycle_id', label: 'Motociclo', relation: 'motorcycles', required: true },
            { name: 'occurrence_id', label: 'Ocorrência', relation: 'occurrences' },
            { name: 'notes', label: 'Notas', type: 'textarea' }
        ]
    },
    interventions: {
        label: 'Intervenções', table: 'interventions', columns: ['motorcycle_id', 'occurrence_id', 'status', 'started_at', 'ended_at'],
        fields: [
            { name: 'motorcycle_id', label: 'Motociclo', relation: 'motorcycles', required: true },
            { name: 'occurrence_id', label: 'Ocorrência', relation: 'occurrences' },
            { name: 'assigned_to', label: 'Atribuída a', relation: 'profiles' },
            { name: 'performed_by', label: 'Executada por', relation: 'profiles' },
            { name: 'status', label: 'Estado', type: 'select', required: true, options: ['in_progress', 'completed', 'cancelled'] },
            { name: 'description', label: 'Descrição', type: 'textarea', required: true },
            { name: 'started_at', label: 'Início', type: 'datetime-local', required: true },
            { name: 'ended_at', label: 'Fim', type: 'datetime-local' }
        ]
    }
};

const relationConfig = {
    clients: { key: 'id', label: 'name' },
    stores: { key: 'id', label: 'name' },
    fleets: { key: 'id', label: 'name' },
    motorcycles: { key: 'id', label: 'plate_number' },
    occurrences: { key: 'id', label: 'title' },
    technical_teams: { key: 'id', label: 'name' },
    mobile_workshops: { key: 'id', label: 'name' },
    rounds: { key: 'id', label: 'planned_date' },
    profiles: { key: 'user_id', label: 'full_name' }
};

const translations = {
    active: 'Ativo', inactive: 'Inativo', maintenance: 'Em manutenção',
    open: 'Aberta', in_progress: 'Em curso', resolved: 'Resolvida', cancelled: 'Cancelada',
    low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
    planned: 'Planeada', completed: 'Concluída', true: 'Sim', false: 'Não',
    administrator: 'Administrador', technician: 'Técnico'
};

let activeModule = 'motorcycles';
let rows = [];
let editingRecord = null;
const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const authMessage = document.querySelector('#auth-message');
const appMessage = document.querySelector('#app-message');
const tableBody = document.querySelector('#table-body');
const emptyState = document.querySelector('#empty-state');

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function showMessage(element, message, type = 'danger') {
    element.textContent = message;
    element.className = `alert alert-${type}`;
}

function clearMessage(element) {
    element.textContent = '';
    element.className = 'alert d-none';
}

function labelFor(value) {
    return translations[value] || value || '—';
}

function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' && translations[value]) return translations[value];
    return String(value);
}

function recordKey(record, module) {
    const keys = module.key || ['id'];
    return keys.map(key => record[key]).join('|');
}

function applyRecordFilter(record, module) {
    const keys = module.key || ['id'];
    return keys.reduce((query, key) => query.eq(key, record[key]), supabase.from(module.table));
}

async function showApplication(user) {
    authView.classList.add('d-none');
    appView.classList.remove('d-none');
    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('user_id', user.id).maybeSingle();
    const accountName = profile?.full_name || user.email || '';
    const accountRole = profile?.role ? labelFor(profile.role) : '';
    document.querySelector('#account-label').textContent = accountRole ? `${accountName} · ${accountRole}` : accountName;
    buildNavigation();
    await loadModule(activeModule);
}

function showLogin() {
    appView.classList.add('d-none');
    authView.classList.remove('d-none');
}

function buildNavigation() {
    const nav = document.querySelector('#module-nav');
    const mobileSelect = document.querySelector('#module-select');
    nav.innerHTML = '';
    mobileSelect.innerHTML = '';
    Object.entries(modules).forEach(([key, module]) => {
        const button = document.createElement('button');
        button.className = `module-button${key === activeModule ? ' active' : ''}`;
        button.type = 'button';
        button.textContent = module.label;
        button.addEventListener('click', () => loadModule(key));
        nav.append(button);

        const option = document.createElement('option');
        option.value = key;
        option.textContent = module.label;
        option.selected = key === activeModule;
        mobileSelect.append(option);
    });
}

function renderRows(query = '') {
    const module = modules[activeModule];
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-PT');
    const filteredRows = rows.map((record, index) => ({ record, index })).filter(({ record }) =>
        !normalizedQuery || module.columns.some(column => String(record[column] ?? '').toLocaleLowerCase('pt-PT').includes(normalizedQuery))
    );

    document.querySelector('#table-head').innerHTML = `<tr>${module.columns.map(column => `<th scope="col">${escapeHTML(column.replaceAll('_', ' '))}</th>`).join('')}<th scope="col"><span class="visually-hidden">Ações</span></th></tr>`;
    tableBody.innerHTML = filteredRows.map(({ record, index }) => `<tr>${module.columns.map(column => `<td>${escapeHTML(displayValue(record[column]))}</td>`).join('')}<td class="text-nowrap text-end"><button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit" data-index="${index}" aria-label="Editar registo">Editar</button> <button class="btn btn-sm btn-outline-danger" type="button" data-action="delete" data-index="${index}" aria-label="Apagar registo">Apagar</button></td></tr>`).join('');
    emptyState.textContent = filteredRows.length ? '' : (normalizedQuery ? 'Não foram encontrados registos.' : 'Ainda não existem registos neste módulo.');
    emptyState.classList.toggle('d-none', filteredRows.length > 0);
}

async function loadModule(key) {
    activeModule = key;
    const module = modules[key];
    document.querySelector('#module-title').textContent = module.label;
    document.querySelector('#table-search').value = '';
    document.querySelector('#module-select').value = key;
    document.querySelectorAll('.module-button').forEach(button => {
        button.classList.toggle('active', button.textContent === module.label);
    });
    clearMessage(appMessage);
    emptyState.textContent = 'A carregar dados…';
    emptyState.classList.remove('d-none');
    tableBody.innerHTML = '';

    const { data, error } = await supabase.from(module.table).select('*').order((module.key || ['id'])[0], { ascending: true }).limit(200);
    if (error) {
        rows = [];
        renderRows();
        showMessage(appMessage, `Não foi possível consultar ${module.label.toLocaleLowerCase('pt-PT')}: ${error.message}. Confirma as políticas RLS desta tabela.`);
        return;
    }
    rows = data || [];
    renderRows();
}

async function buildFields(record = {}) {
    const module = modules[activeModule];
    const container = document.querySelector('#record-fields');
    container.innerHTML = '';

    for (const field of module.fields) {
        const group = document.createElement('div');
        group.className = 'mb-3';
        const id = `field-${field.name}`;
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = field.label;
        group.append(label);

        let input;
        if (field.relation || field.type === 'select') {
            input = document.createElement('select');
            input.className = 'form-select';
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = field.required ? 'Selecione…' : 'Não definido';
            input.append(emptyOption);
            let options = field.options || [];

            if (field.relation) {
                const relation = relationConfig[field.relation];
                const { data, error } = await supabase.from(field.relation).select(`${relation.key}, ${relation.label}`).order(relation.label).limit(500);
                if (error) throw new Error(`Não foi possível carregar opções de ${field.label}: ${error.message}`);
                options = (data || []).map(item => ({ value: item[relation.key], label: item[relation.label] || item[relation.key] }));
            }
            options.forEach(option => {
                const item = typeof option === 'object' ? option : { value: option, label: labelFor(option) };
                const optionElement = document.createElement('option');
                optionElement.value = item.value;
                optionElement.textContent = item.label;
                input.append(optionElement);
            });
        } else if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'form-control';
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.className = 'form-control';
            input.type = field.type || 'text';
            if (field.step) input.step = field.step;
        }

        input.id = id;
        input.name = field.name;
        input.required = Boolean(field.required);
        input.value = record[field.name] ?? '';
        if (field.type === 'datetime-local' && input.value) input.value = new Date(input.value).toISOString().slice(0, 16);
        group.append(input);
        container.append(group);
    }
}

async function openRecordForm(record = null) {
    editingRecord = record;
    document.querySelector('#record-modal-title').textContent = record ? `Editar: ${modules[activeModule].label}` : `Novo registo: ${modules[activeModule].label}`;
    document.querySelector('#save-record').disabled = true;
    try {
        await buildFields(record || {});
        document.querySelector('#save-record').disabled = false;
        modal.show();
    } catch (error) {
        showMessage(appMessage, error.message);
    }
}

document.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    clearMessage(authMessage);
    if (!supabase) {
        showMessage(authMessage, 'Configura o URL e a chave publishable/anon em supabase-config.js para ligar ao teu projeto.');
        return;
    }

    const email = document.querySelector('#auth-email').value.trim();
    const password = document.querySelector('#auth-password').value;
    const button = document.querySelector('#auth-submit');
    button.disabled = true;
    const result = await supabase.auth.signInWithPassword({ email, password });
    button.disabled = false;

    if (result.error) showMessage(authMessage, result.error.message);
});

document.querySelector('#sign-out').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showMessage(appMessage, error.message);
});

document.querySelector('#add-record').addEventListener('click', () => openRecordForm());
document.querySelector('#table-search').addEventListener('input', event => renderRows(event.currentTarget.value));
document.querySelector('#module-select').addEventListener('change', event => loadModule(event.currentTarget.value));

tableBody.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const record = rows[Number(button.dataset.index)];
    if (!record) return;
    if (button.dataset.action === 'edit') {
        await openRecordForm(record);
        return;
    }
    if (!window.confirm('Apagar este registo? Esta ação não pode ser desfeita.')) return;
    const { error } = await applyRecordFilter(record, modules[activeModule]).delete();
    if (error) showMessage(appMessage, `Não foi possível apagar o registo: ${error.message}`);
    else await loadModule(activeModule);
});

document.querySelector('#record-form').addEventListener('submit', async event => {
    event.preventDefault();
    const module = modules[activeModule];
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    module.fields.forEach(field => {
        if (payload[field.name] === '') payload[field.name] = null;
        if (field.type === 'number' && payload[field.name] !== null) payload[field.name] = Number(payload[field.name]);
        if (field.type === 'select' && field.options?.includes('true') && payload[field.name] !== null) payload[field.name] = payload[field.name] === 'true';
        if (field.type === 'datetime-local' && payload[field.name]) payload[field.name] = new Date(payload[field.name]).toISOString();
    });

    const saveButton = document.querySelector('#save-record');
    saveButton.disabled = true;
    let result;
    if (editingRecord) {
        result = await applyRecordFilter(editingRecord, module).update(payload);
    } else {
        result = await supabase.from(module.table).insert(payload);
    }
    saveButton.disabled = false;

    if (result.error) {
        showMessage(appMessage, `Não foi possível guardar o registo: ${result.error.message}`);
        return;
    }
    modal.hide();
    await loadModule(activeModule);
});

async function initializeSupabase() {
    if (!hasConfig) {
        showLogin();
        showMessage(authMessage, 'Configura o URL e a chave publishable/anon em supabase-config.js para começar.');
        return;
    }

    try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
        supabase = createClient(config.url, config.anonKey);
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION') return;
            if (session?.user) showApplication(session.user);
            else showLogin();
        });
        const { data, error } = await supabase.auth.getSession();
        if (error) showMessage(authMessage, error.message);
        if (data.session?.user) showApplication(data.session.user);
        else showLogin();
    } catch (error) {
        showLogin();
        showMessage(authMessage, 'A aplicação abriu, mas não foi possível carregar o SDK do Supabase. Verifica a ligação à internet e tenta novamente.');
        console.error('Falha ao carregar o SDK do Supabase:', error);
    }
}

initializeSupabase();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.error('Falha ao registar o service worker:', error)));
}
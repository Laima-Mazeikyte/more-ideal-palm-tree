import './style.css'
import { createIcons, Plus, X, User, ChevronDown, Check } from 'lucide'
import { supabase } from './supabase.js'
import {
  signInAnonymously,
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  claimAnonymousTodos,
} from './auth.js'

// ─── DOM ────────────────────────────────────────────────────────────────────

const form = document.querySelector('.todo-app__form')
const input = document.querySelector('#todo-input')
const itemsContainer = document.querySelector('.todo-app__items')
const eyebrow = document.querySelector('.todo-app__eyebrow')
const progressEl = document.querySelector('.todo-app__progress')

const journeyPickerTrigger = document.querySelector('.journey-picker__trigger')
const journeyPickerDropdown = document.querySelector('.journey-picker__dropdown')
const journeyPickerLabel = document.querySelector('.journey-picker__label')
const journeyPickerDot = document.querySelector('.journey-picker__dot')

const authDialog = document.querySelector('.auth-dialog')
const authAuthView = document.querySelector('.auth-dialog__auth-view')
const authUserView = document.querySelector('.auth-dialog__user-view')
const authForm = document.querySelector('.auth-dialog__form')
const authEmailInput = document.querySelector('#auth-email')
const authPasswordInput = document.querySelector('#auth-password')
const authErrorEl = document.querySelector('.auth-dialog__error')
const authSubmitButton = document.querySelector('.auth-dialog__submit')
const authSubmitLabel = document.querySelector('.auth-dialog__submit-label')
const authTabs = document.querySelectorAll('.auth-dialog__tab')

const accountButton = document.querySelector('.todo-app__account-button')
const authDialogUserEmail = document.querySelector('.auth-dialog__user-email')
const authDialogSignOut = document.querySelector('.auth-dialog__sign-out')

if (!form || !input || !itemsContainer) {
  throw new Error('Todo app markup is missing required elements.')
}

// Set date in eyebrow
if (eyebrow) {
  eyebrow.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── State ──────────────────────────────────────────────────────────────────

let steps = []
let journeys = []
let selectedJourneyId = null
const renderedIds = new Set()
let authMode = 'signup' // 'signup' | 'signin'

// ─── Icons ──────────────────────────────────────────────────────────────────

function hydrateIcons() {
  createIcons({
    icons: { Plus, X, User, ChevronDown, Check },
    attrs: { 'aria-hidden': 'true' },
  })
}

// ─── Progress ───────────────────────────────────────────────────────────────

function updateProgress() {
  if (!progressEl) return
  const total = steps.length
  const done = steps.filter((s) => s.completed).length
  if (total === 0 || done === 0) {
    progressEl.textContent = ''
    return
  }
  if (done === total) {
    progressEl.textContent = `All ${total} step${total === 1 ? '' : 's'} done`
    return
  }
  progressEl.textContent = `${done} of ${total} step${total === 1 ? '' : 's'} done`
}

// ─── Journey Picker ──────────────────────────────────────────────────────────

function populateJourneyPicker() {
  if (!journeyPickerDropdown) return
  journeyPickerDropdown.replaceChildren()

  for (const journey of journeys) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'journey-picker__option'
    option.setAttribute('role', 'option')
    option.dataset.journeyId = journey.id
    option.dataset.journeySlug = journey.slug
    option.setAttribute('aria-selected', String(journey.id === selectedJourneyId))

    const dot = document.createElement('span')
    dot.className = 'journey-picker__option-dot'
    dot.setAttribute('aria-hidden', 'true')
    dot.dataset.journeySlug = journey.slug

    const label = document.createElement('span')
    label.className = 'journey-picker__option-label'
    label.textContent = journey.name

    const checkIcon = document.createElement('i')
    checkIcon.dataset.lucide = 'check'
    checkIcon.className = 'journey-picker__option-check'

    option.append(dot, label, checkIcon)
    journeyPickerDropdown.append(option)
  }

  hydrateIcons()

  // Select the first journey if nothing is selected yet
  if (!selectedJourneyId && journeys.length > 0) {
    selectJourney(journeys[0].id)
  } else if (selectedJourneyId) {
    updateTriggerDisplay()
  }
}

function selectJourney(journeyId) {
  selectedJourneyId = journeyId
  updateTriggerDisplay()

  if (!journeyPickerDropdown) return
  journeyPickerDropdown.querySelectorAll('.journey-picker__option').forEach((opt) => {
    opt.setAttribute('aria-selected', String(opt.dataset.journeyId === journeyId))
  })
}

function updateTriggerDisplay() {
  const journey = journeys.find((j) => j.id === selectedJourneyId)
  if (!journey) return
  if (journeyPickerLabel) journeyPickerLabel.textContent = journey.name
  if (journeyPickerDot) journeyPickerDot.dataset.journeySlug = journey.slug
  if (journeyPickerTrigger) journeyPickerTrigger.dataset.journeySlug = journey.slug
}

function openJourneyPicker() {
  if (!journeyPickerDropdown || !journeyPickerTrigger) return
  journeyPickerDropdown.hidden = false
  journeyPickerTrigger.setAttribute('aria-expanded', 'true')
  journeyPickerTrigger.classList.add('is-open')
}

function closeJourneyPicker() {
  if (!journeyPickerDropdown || !journeyPickerTrigger) return
  journeyPickerDropdown.hidden = true
  journeyPickerTrigger.setAttribute('aria-expanded', 'false')
  journeyPickerTrigger.classList.remove('is-open')
}

journeyPickerTrigger?.addEventListener('click', (event) => {
  event.stopPropagation()
  if (journeyPickerDropdown?.hidden) {
    openJourneyPicker()
  } else {
    closeJourneyPicker()
  }
})

journeyPickerDropdown?.addEventListener('click', (event) => {
  const option = event.target.closest('.journey-picker__option')
  if (!option) return
  selectJourney(option.dataset.journeyId)
  closeJourneyPicker()
})

// Close picker when clicking outside
document.addEventListener('click', (event) => {
  if (!journeyPickerDropdown || journeyPickerDropdown.hidden) return
  const picker = journeyPickerTrigger?.closest('.journey-picker')
  if (picker && !picker.contains(event.target)) {
    closeJourneyPicker()
  }
})

// Close picker on Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && journeyPickerDropdown && !journeyPickerDropdown.hidden) {
    closeJourneyPicker()
    journeyPickerTrigger?.focus()
  }
})

// ─── Render ─────────────────────────────────────────────────────────────────

function renderSteps() {
  itemsContainer.replaceChildren()

  if (steps.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'todo-empty'
    empty.textContent = 'What will you do today? Add your first step above.'
    itemsContainer.append(empty)
    updateProgress()
    return
  }

  for (const step of steps) {
    const journey = step.journeys

    const item = document.createElement('article')
    item.className = 'todo-item'
    if (step.completed) item.classList.add('is-completed')
    if (journey?.slug) item.dataset.journeySlug = journey.slug

    const isNew = !renderedIds.has(step.id)
    if (isNew) {
      item.classList.add('is-new')
      renderedIds.add(step.id)
    }

    const toggle = document.createElement('input')
    toggle.className = 'todo-item__toggle'
    toggle.type = 'checkbox'
    toggle.checked = step.completed
    toggle.dataset.todoId = step.id
    toggle.setAttribute('aria-label', `Mark "${step.text}" as complete`)

    const text = document.createElement('p')
    text.className = 'todo-item__text'
    text.textContent = step.text

    const badge = document.createElement('span')
    badge.className = 'todo-item__journey-badge'
    badge.textContent = journey?.name ?? ''
    if (journey?.slug) badge.dataset.journeySlug = journey.slug

    const deleteButton = document.createElement('button')
    deleteButton.className = 'todo-item__delete-button'
    deleteButton.type = 'button'
    deleteButton.dataset.todoId = step.id
    deleteButton.setAttribute('aria-label', `Delete "${step.text}"`)

    const icon = document.createElement('i')
    icon.dataset.lucide = 'x'
    deleteButton.append(icon)

    item.append(toggle, text, badge, deleteButton)
    itemsContainer.append(item)
  }

  hydrateIcons()
  updateProgress()
}

// ─── Supabase CRUD ───────────────────────────────────────────────────────────

async function loadJourneys() {
  const { data, error } = await supabase
    .from('journeys')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to load journeys:', error.message)
    return
  }

  journeys = data
  populateJourneyPicker()
}

async function loadSteps() {
  const { data, error } = await supabase
    .from('steps')
    .select('*, journeys(id, name, slug)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load steps:', error.message)
    return
  }

  steps = data
  for (const step of steps) {
    renderedIds.add(step.id)
  }
  renderSteps()
}

async function addStep(text, journeyId) {
  const { data, error } = await supabase
    .from('steps')
    .insert({ text, completed: false, journey_id: journeyId })
    .select('*, journeys(id, name, slug)')
    .single()

  if (error) {
    console.error('Failed to add step:', error.message)
    return
  }

  steps.push(data)
  renderSteps()
}

async function toggleStep(id, completed) {
  const { error } = await supabase
    .from('steps')
    .update({ completed })
    .eq('id', id)

  if (error) {
    console.error('Failed to update step:', error.message)
    const step = steps.find((s) => s.id === id)
    if (step) step.completed = !completed
    renderSteps()
    return
  }

  const step = steps.find((s) => s.id === id)
  if (step) step.completed = completed
  renderSteps()
}

async function deleteStep(id, itemEl, deleteButton) {
  deleteButton.disabled = true

  const { error } = await supabase.from('steps').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete step:', error.message)
    deleteButton.disabled = false
    return
  }

  renderedIds.delete(id)

  if (itemEl) {
    itemEl.classList.add('is-removing')
    setTimeout(() => {
      steps = steps.filter((s) => s.id !== id)
      renderSteps()
    }, 210)
  } else {
    steps = steps.filter((s) => s.id !== id)
    renderSteps()
  }
}

// ─── Auth UI ─────────────────────────────────────────────────────────────────

function setAuthMode(mode) {
  authMode = mode
  authTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-selected', String(isActive))
  })
  if (authSubmitLabel) authSubmitLabel.textContent = mode === 'signup' ? 'Create account' : 'Sign in'
  if (authPasswordInput) {
    authPasswordInput.setAttribute(
      'autocomplete',
      mode === 'signup' ? 'new-password' : 'current-password',
    )
  }
  clearAuthError()
}

function showAuthError(message) {
  if (!authErrorEl) return
  authErrorEl.textContent = message
  authErrorEl.hidden = false
}

function clearAuthError() {
  if (!authErrorEl) return
  authErrorEl.textContent = ''
  authErrorEl.hidden = true
}

function updateHeaderForUser(user) {
  const isAnonymous = !user?.email

  if (accountButton) {
    accountButton.classList.toggle('is-signed-in', !isAnonymous)
    if (!isAnonymous) {
      accountButton.dataset.initial = (user.email[0] ?? '?').toUpperCase()
    } else {
      delete accountButton.dataset.initial
    }
  }

  if (authAuthView) authAuthView.hidden = !isAnonymous
  if (authUserView) authUserView.hidden = isAnonymous
  if (!isAnonymous && authDialogUserEmail) {
    authDialogUserEmail.textContent = user.email ?? ''
  }
}

function openAuthDialog() {
  authDialog?.showModal()
  authEmailInput?.focus()
}

function closeAuthDialog() {
  authDialog?.close()
}

authDialog?.addEventListener('close', () => {
  clearAuthError()
  authForm?.reset()
  setAuthMode('signup')
  if (authSubmitButton) authSubmitButton.disabled = false
})

// ─── Auth Events ─────────────────────────────────────────────────────────────

accountButton?.addEventListener('click', () => {
  openAuthDialog()
})

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setAuthMode(tab.dataset.mode)
  })
})

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const email = authEmailInput?.value.trim() ?? ''
  const password = authPasswordInput?.value ?? ''

  if (!email || !password) {
    showAuthError('Please enter your email and password.')
    return
  }

  authSubmitButton.disabled = true
  clearAuthError()

  if (authMode === 'signup') {
    const { error } = await signUp(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }
    closeAuthDialog()
  } else {
    const { data: sessionData } = await getSession()
    const anonUserId = sessionData.session?.user?.id ?? null
    const wasAnonymous = sessionData.session?.user?.is_anonymous ?? false

    const { error } = await signIn(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }

    if (wasAnonymous && anonUserId) {
      const { error: rpcError } = await claimAnonymousTodos(anonUserId)
      if (rpcError) {
        console.error('Failed to migrate anonymous steps:', rpcError.message)
      }
    }

    closeAuthDialog()
  }

  authSubmitButton.disabled = false
})

authDialogSignOut?.addEventListener('click', async () => {
  closeAuthDialog()
  await signOut()
  await signInAnonymously()
})

// ─── Step Events ─────────────────────────────────────────────────────────────

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const text = input.value.trim()
  if (!text || !selectedJourneyId) return
  input.value = ''
  input.focus()
  addStep(text, selectedJourneyId)
})

itemsContainer.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !target.matches('.todo-item__toggle')) return

  const id = target.dataset.todoId
  const step = steps.find((s) => s.id === id)
  if (!step) return
  step.completed = target.checked
  renderSteps()
  toggleStep(id, target.checked)
})

itemsContainer.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return

  const deleteButton = target.closest('.todo-item__delete-button')
  if (!deleteButton || !(deleteButton instanceof HTMLButtonElement)) return

  const id = deleteButton.dataset.todoId
  const itemEl = deleteButton.closest('.todo-item')
  deleteStep(id, itemEl, deleteButton)
})

// ─── Init ───────────────────────────────────────────────────────────────────

hydrateIcons()

onAuthStateChange((_event, session) => {
  updateHeaderForUser(session?.user ?? null)
  steps = []
  renderedIds.clear()
  loadSteps()
})

async function init() {
  // Load journeys first so the picker is populated before any interaction
  await loadJourneys()

  const { data } = await getSession()
  if (!data.session) {
    await signInAnonymously()
    // onAuthStateChange will fire → loadSteps()
  } else {
    updateHeaderForUser(data.session.user)
    loadSteps()
  }
}

init()

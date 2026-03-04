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
import { loadPaths, createPath, addStepToPath, removeStepFromPath, loadStepPathsMap } from './paths.js'
import { loadMilestones, createMilestone } from './milestones.js'
import { renderWeekView } from './week-view.js'
import { setView } from './views.js'

// ─── DOM ────────────────────────────────────────────────────────────────────

const form = document.querySelector('.todo-app__form')
const input = document.querySelector('#todo-input')
const itemsContainer = document.querySelector('.todo-app__items')
const eyebrow = document.querySelector('.todo-app__eyebrow')
const progressEl = document.querySelector('.todo-app__progress')

const journeyContextBtn = document.querySelector('.journey-context')
const journeyContextName = document.querySelector('.journey-context__name')

const weekViewContainer = document.querySelector('.week-view')
const viewNavTabs = document.querySelectorAll('.view-nav__tab')

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
const authPasswordToggle = document.querySelector('.auth-dialog__password-toggle')

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
let paths = []
let milestones = []
let stepPathsMap = new Map()
let activeJourneyId = localStorage.getItem('activeJourneyId') || null
let currentUserId = null
let isAnonymousUser = true
const renderedIds = new Set()
let authMode = 'signup' // 'signup' | 'signin'
let savedScrollTop = 0

// ─── Icons ──────────────────────────────────────────────────────────────────

function hydrateIcons() {
  createIcons({
    icons: { Plus, X, User, ChevronDown, Check },
    attrs: { 'aria-hidden': 'true' },
  })
}

// ─── Progress (Momentum Line) ───────────────────────────────────────────────

function updateProgress() {
  if (!progressEl) return
  const total = steps.length

  if (total === 0) {
    progressEl.textContent = ''
    return
  }

  const noun = total === 1 ? 'step' : 'steps'
  progressEl.textContent = `${total} ${noun} today`
}

// ─── Sticky Journey Context ─────────────────────────────────────────────────

function updateJourneyContext() {
  if (!activeJourneyId && journeys.length > 0) {
    activeJourneyId = journeys[0].id
    localStorage.setItem('activeJourneyId', activeJourneyId)
  }
  const journey = journeys.find((j) => j.id === activeJourneyId)
  if (journeyContextBtn) {
    journeyContextBtn.dataset.journeySlug = journey?.slug ?? ''
  }
  if (journeyContextName) {
    journeyContextName.textContent = journey?.name ?? 'Journey'
  }
}

journeyContextBtn?.addEventListener('click', (e) => {
  e.stopPropagation()
  const currentIdx = journeys.findIndex((j) => j.id === activeJourneyId)
  const nextIdx = (currentIdx + 1) % journeys.length
  activeJourneyId = journeys[nextIdx].id
  localStorage.setItem('activeJourneyId', activeJourneyId)
  updateJourneyContext()
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatStepTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Step Detail View ────────────────────────────────────────────────────────

function buildStepDetailView(step) {
  const detail = document.createElement('div')
  detail.className = 'step-detail'
  detail.dataset.stepId = step.id
  detail.hidden = true

  // ── Journey section ──
  const journeySection = document.createElement('div')
  journeySection.className = 'step-detail__section'

  const journeyLabel = document.createElement('span')
  journeyLabel.className = 'step-detail__label'
  journeyLabel.textContent = 'Journey'

  const journeyList = document.createElement('div')
  journeyList.className = 'step-detail__journey-list'

  for (const j of journeys) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'step-detail__journey-option'
    btn.dataset.journeyId = j.id
    btn.dataset.stepId = step.id
    btn.textContent = j.name
    if (j.id === step.journey_id) btn.classList.add('is-active')
    journeyList.append(btn)
  }

  journeySection.append(journeyLabel, journeyList)

  // ── Path section (labels) ──
  const pathSection = document.createElement('div')
  pathSection.className = 'step-detail__section'

  const pathLabel = document.createElement('span')
  pathLabel.className = 'step-detail__label'
  pathLabel.textContent = 'Paths'

  const pathChips = document.createElement('div')
  pathChips.className = 'step-detail__path-chips'

  const stepPaths = stepPathsMap.get(step.id) || []
  for (const p of stepPaths) {
    pathChips.append(buildPathChip(step.id, p))
  }

  const addPathInput = document.createElement('input')
  addPathInput.className = 'step-detail__add-path'
  addPathInput.type = 'text'
  addPathInput.placeholder = '+ path'
  addPathInput.setAttribute('aria-label', 'Add path')

  pathChips.append(addPathInput)
  pathSection.append(pathLabel, pathChips)

  // ── Milestone section (epic linking) ──
  const msSection = document.createElement('div')
  msSection.className = 'step-detail__section'

  const msLabel = document.createElement('span')
  msLabel.className = 'step-detail__label'
  msLabel.textContent = 'Milestone'

  const msSelect = document.createElement('select')
  msSelect.className = 'step-detail__milestone-select'
  msSelect.dataset.stepId = step.id

  const noneOpt = document.createElement('option')
  noneOpt.value = ''
  noneOpt.textContent = 'None'
  msSelect.append(noneOpt)

  const journeyMilestones = milestones.filter((m) => m.journey_id === step.journey_id)
  for (const m of journeyMilestones) {
    const opt = document.createElement('option')
    opt.value = m.id
    opt.textContent = m.name
    if (step.milestone_id === m.id) opt.selected = true
    msSelect.append(opt)
  }

  // Inline milestone creation
  const msCreateInput = document.createElement('input')
  msCreateInput.className = 'step-detail__add-milestone'
  msCreateInput.type = 'text'
  msCreateInput.placeholder = '+ milestone'
  msCreateInput.setAttribute('aria-label', 'Create milestone')
  msCreateInput.dataset.stepId = step.id

  msSection.append(msLabel, msSelect, msCreateInput)

  detail.append(journeySection, pathSection, msSection)
  return detail
}

function buildPathChip(stepId, path) {
  const chip = document.createElement('span')
  chip.className = 'step-detail__path-chip'
  chip.dataset.pathId = path.id
  chip.dataset.stepId = stepId

  const name = document.createElement('span')
  name.textContent = path.name

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.className = 'step-detail__path-remove'
  removeBtn.setAttribute('aria-label', `Remove ${path.name}`)
  removeBtn.textContent = '\u00d7'

  chip.append(name, removeBtn)
  return chip
}

// ─── Step Element Builder ────────────────────────────────────────────────────

function buildStepElement(step, journey, isNew) {
  const item = document.createElement('article')
  item.className = 'todo-item'
  if (step.completed) item.classList.add('is-completed')
  item.dataset.stepId = step.id
  if (journey?.slug) item.dataset.journeySlug = journey.slug

  if (isNew) {
    item.classList.add('is-new')
    renderedIds.add(step.id)
  }

  const content = document.createElement('div')
  content.className = 'todo-item__content'

  const text = document.createElement('p')
  text.className = 'todo-item__text'
  text.textContent = step.text
  content.append(text)

  // Subtle metadata line (paths + milestone only — journey is conveyed by color)
  const metaParts = []
  const stepPaths = stepPathsMap.get(step.id)
  if (stepPaths && stepPaths.length > 0) {
    metaParts.push(...stepPaths.map((p) => p.name))
  }
  if (step.milestones?.name) metaParts.push(step.milestones.name)

  if (metaParts.length > 0) {
    const metaEl = document.createElement('p')
    metaEl.className = 'todo-item__meta'
    metaEl.textContent = metaParts.join(' · ')
    content.append(metaEl)
  }

  const timestamp = document.createElement('time')
  timestamp.className = 'todo-item__timestamp'
  timestamp.textContent = formatStepTime(step.created_at)
  if (step.created_at) timestamp.setAttribute('datetime', step.created_at)

  const actions = document.createElement('div')
  actions.className = 'todo-item__actions'

  // Expand button for detail view
  if (!isAnonymousUser) {
    const expandBtn = document.createElement('button')
    expandBtn.type = 'button'
    expandBtn.className = 'todo-item__expand'
    expandBtn.setAttribute('aria-label', 'Step details')
    expandBtn.textContent = '···'
    actions.append(expandBtn)
  }

  const deleteButton = document.createElement('button')
  deleteButton.className = 'todo-item__delete-button'
  deleteButton.type = 'button'
  deleteButton.dataset.todoId = step.id
  deleteButton.setAttribute('aria-label', `Delete "${step.text}"`)

  const icon = document.createElement('i')
  icon.dataset.lucide = 'x'
  deleteButton.append(icon)

  actions.append(deleteButton)
  item.append(content, timestamp, actions)

  // Detail view (hidden by default, for authenticated users)
  if (!isAnonymousUser) {
    item.append(buildStepDetailView(step))
  }

  return item
}

function rebuildStepMeta(stepId) {
  const step = steps.find((s) => s.id === stepId)
  if (!step) return
  const tile = itemsContainer.querySelector(`.todo-item[data-step-id="${stepId}"]`)
  if (!tile) return

  // Update meta line
  const oldMeta = tile.querySelector('.todo-item__meta')
  const metaParts = []
  const stepPaths = stepPathsMap.get(step.id)
  if (stepPaths && stepPaths.length > 0) {
    metaParts.push(...stepPaths.map((p) => p.name))
  }
  if (step.milestones?.name) metaParts.push(step.milestones.name)

  const contentEl = tile.querySelector('.todo-item__content')
  if (metaParts.length > 0) {
    if (oldMeta) {
      oldMeta.textContent = metaParts.join(' · ')
    } else {
      const metaEl = document.createElement('p')
      metaEl.className = 'todo-item__meta'
      metaEl.textContent = metaParts.join(' · ')
      contentEl?.append(metaEl)
    }
  } else if (oldMeta) {
    oldMeta.remove()
  }
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderSteps() {
  itemsContainer.replaceChildren()

  if (steps.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'todo-empty'
    empty.textContent = 'Every journey starts with a single step.'
    itemsContainer.append(empty)
    updateProgress()
    return
  }

  for (const step of steps) {
    const isNew = !renderedIds.has(step.id)
    itemsContainer.append(buildStepElement(step, step.journeys, isNew))
  }

  hydrateIcons()
  updateProgress()
  refreshWeekView()
}

// ─── Week View ──────────────────────────────────────────────────────────────

function refreshWeekView() {
  if (!weekViewContainer || weekViewContainer.hidden) return
  renderWeekView(weekViewContainer, { paths, steps, stepPathsMap, milestones, journeys })
}

// ─── View Navigation ────────────────────────────────────────────────────────

viewNavTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setView(tab.dataset.view)
  })
})

document.addEventListener('viewchange', (event) => {
  const view = event.detail.view

  // Update tab active states
  viewNavTabs.forEach((tab) => {
    const isActive = tab.dataset.view === view
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-pressed', String(isActive))
  })

  if (view === 'today') {
    if (weekViewContainer) weekViewContainer.hidden = true
    itemsContainer.hidden = false
    form.hidden = false
    window.scrollTo(0, savedScrollTop)
  } else if (view === 'week') {
    savedScrollTop = window.scrollY
    itemsContainer.hidden = true
    form.hidden = true
    if (weekViewContainer) {
      weekViewContainer.hidden = false
      refreshWeekView()
    }
  }
})

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
  updateJourneyContext()
}

async function loadAllPaths() {
  paths = await loadPaths()
}

async function loadAllMilestones() {
  milestones = await loadMilestones()
}

async function loadSteps() {
  const { data, error } = await supabase
    .from('steps')
    .select('*, journeys(id, name, slug), milestones(id, name, target_count)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load steps:', error.message)
    return
  }

  steps = data
  stepPathsMap = await loadStepPathsMap()
  for (const step of steps) {
    renderedIds.add(step.id)
  }
  renderSteps()
}

async function addStep(text, journeyId) {
  if (!currentUserId) {
    console.warn('Cannot add step without an authenticated session.')
    return
  }
  const insertPayload = { text, completed: false, journey_id: journeyId, user_id: currentUserId }

  const { data, error } = await supabase
    .from('steps')
    .insert(insertPayload)
    .select('*, journeys(id, name, slug), milestones(id, name, target_count)')
    .single()

  if (error) {
    console.error('Failed to add step:', error.message)
    return
  }

  steps.push(data)

  // Remove empty-state message if present
  const emptyEl = itemsContainer.querySelector('.todo-empty')
  if (emptyEl) emptyEl.remove()

  // Append step to the end (chronological)
  const stepEl = buildStepElement(data, data.journeys, true)
  itemsContainer.append(stepEl)

  hydrateIcons()
  updateProgress()
  refreshWeekView()
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
    const itemEl = itemsContainer.querySelector(`.todo-item[data-step-id="${id}"]`)
    if (itemEl) itemEl.classList.toggle('is-completed', !completed)
    return
  }

  const step = steps.find((s) => s.id === id)
  if (step) step.completed = completed
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

  const removeFromDom = () => {
    steps = steps.filter((s) => s.id !== id)
    if (itemEl) itemEl.remove()

    if (steps.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'todo-empty'
      empty.textContent = 'Every journey starts with a single step.'
      itemsContainer.append(empty)
    }

    updateProgress()
    refreshWeekView()
  }

  if (itemEl) {
    itemEl.classList.add('is-removing')
    setTimeout(removeFromDom, 210)
  } else {
    removeFromDom()
  }
}

async function updateStepJourney(id, journeyId) {
  const { data, error } = await supabase
    .from('steps')
    .update({ journey_id: journeyId })
    .eq('id', id)
    .select('*, journeys(id, name, slug)')
    .single()

  if (error) {
    console.error('Failed to update step journey:', error.message)
    return
  }

  const idx = steps.findIndex((s) => s.id === id)
  if (idx !== -1) steps[idx] = data

  rebuildStepMeta(id)

  // Update slug + detail view journey buttons
  const tile = itemsContainer.querySelector(`.todo-item[data-step-id="${id}"]`)
  if (tile) {
    if (data.journeys?.slug) tile.dataset.journeySlug = data.journeys.slug
    tile.querySelectorAll('.step-detail__journey-option').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.journeyId === journeyId)
    })
  }

  refreshWeekView()
}

async function updateStepMilestone(stepId, milestoneId) {
  const { error } = await supabase
    .from('steps')
    .update({ milestone_id: milestoneId || null })
    .eq('id', stepId)

  if (error) {
    console.error('Failed to update step milestone:', error.message)
    return
  }

  const step = steps.find((s) => s.id === stepId)
  if (step) {
    step.milestone_id = milestoneId || null
    step.milestones = milestoneId ? milestones.find((m) => m.id === milestoneId) || null : null
    rebuildStepMeta(stepId)
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
  isAnonymousUser = isAnonymous

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

authPasswordToggle?.addEventListener('click', () => {
  if (!authPasswordInput) return
  const isHidden = authPasswordInput.type === 'password'
  authPasswordInput.type = isHidden ? 'text' : 'password'
  authPasswordToggle.classList.toggle('is-visible', isHidden)
  authPasswordToggle.setAttribute('aria-pressed', String(isHidden))
  authPasswordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
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
    const { data: sessionData } = await getSession()
    const anonUserId = sessionData.session?.user?.id ?? null
    const wasAnonymous = sessionData.session?.user?.is_anonymous ?? false

    const { data: signUpData, error } = await signUp(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }
    if (signUpData?.user?.email && !signUpData?.user?.email_confirmed_at) {
      showAuthError('Check your email to confirm your account.')
      authSubmitButton.disabled = false
      return
    }

    if (wasAnonymous && anonUserId && signUpData?.session) {
      const { error: rpcError } = await claimAnonymousTodos(anonUserId)
      if (rpcError) {
        console.error('Failed to migrate anonymous steps on signup:', rpcError.message)
      }
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
  if (!text || !activeJourneyId) return
  input.value = ''
  input.focus()
  localStorage.setItem('activeJourneyId', activeJourneyId)
  addStep(text, activeJourneyId)
})

// Unified click handler for items container
itemsContainer.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return

  // Delete button
  const deleteButton = target.closest('.todo-item__delete-button')
  if (deleteButton instanceof HTMLButtonElement) {
    const id = deleteButton.dataset.todoId
    const itemEl = deleteButton.closest('.todo-item')
    deleteStep(id, itemEl, deleteButton)
    return
  }

  // Expand button → toggle detail view
  const expandBtn = target.closest('.todo-item__expand')
  if (expandBtn instanceof HTMLButtonElement) {
    const tile = expandBtn.closest('.todo-item')
    const detail = tile?.querySelector('.step-detail')
    if (detail) {
      // Collapse any other open details first
      itemsContainer.querySelectorAll('.step-detail:not([hidden])').forEach((d) => {
        if (d !== detail) {
          d.hidden = true
          d.closest('.todo-item')?.classList.remove('is-expanded')
        }
      })
      detail.hidden = !detail.hidden
      tile.classList.toggle('is-expanded', !detail.hidden)
    }
    return
  }

  // Journey change in detail view
  const journeyOption = target.closest('.step-detail__journey-option')
  if (journeyOption instanceof HTMLButtonElement) {
    const journeyId = journeyOption.dataset.journeyId
    const stepId = journeyOption.dataset.stepId
    if (journeyId && stepId) {
      updateStepJourney(stepId, journeyId)
    }
    return
  }

  // Path chip removal
  const pathRemove = target.closest('.step-detail__path-remove')
  if (pathRemove) {
    const chip = pathRemove.closest('.step-detail__path-chip')
    if (chip) {
      const stepId = chip.dataset.stepId
      const pathId = chip.dataset.pathId
      removeStepFromPath(stepId, pathId).then((ok) => {
        if (ok) {
          const existing = stepPathsMap.get(stepId) || []
          stepPathsMap.set(stepId, existing.filter((p) => p.id !== pathId))
          chip.remove()
          rebuildStepMeta(stepId)
        }
      })
    }
    return
  }

  // Don't toggle completion if clicking inside detail view or actions
  if (target.closest('.step-detail')) return
  if (target.closest('.todo-item__actions')) return

  // Toggle completion by clicking the tile body
  const tile = target.closest('.todo-item')
  if (!tile) return

  const id = tile.dataset.stepId
  const step = steps.find((s) => s.id === id)
  if (!step) return

  step.completed = !step.completed
  tile.classList.toggle('is-completed', step.completed)
  toggleStep(id, step.completed)
})

// Path add via inline input in detail view
itemsContainer.addEventListener('keydown', async (event) => {
  const addPathInput = event.target.closest('.step-detail__add-path')
  if (addPathInput && event.key === 'Enter') {
    event.preventDefault()
    const name = addPathInput.value.trim()
    if (!name || isAnonymousUser) return

    const stepId = addPathInput.closest('.step-detail').dataset.stepId

    let path = paths.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (!path) {
      path = await createPath(name, currentUserId)
      if (path) paths.push(path)
    }
    if (!path) return

    const ok = await addStepToPath(stepId, path.id)
    if (ok) {
      const existing = stepPathsMap.get(stepId) || []
      existing.push({ id: path.id, name: path.name })
      stepPathsMap.set(stepId, existing)

      const chip = buildPathChip(stepId, path)
      addPathInput.before(chip)
      addPathInput.value = ''
      rebuildStepMeta(stepId)
    }
    return
  }

  // Milestone creation via inline input in detail view
  const addMsInput = event.target.closest('.step-detail__add-milestone')
  if (addMsInput && event.key === 'Enter') {
    event.preventDefault()
    const name = addMsInput.value.trim()
    const stepId = addMsInput.dataset.stepId
    if (!name || !currentUserId || isAnonymousUser) return

    const step = steps.find((s) => s.id === stepId)
    if (!step) return

    addMsInput.disabled = true
    const newMs = await createMilestone(step.journey_id, name, currentUserId)
    addMsInput.disabled = false
    addMsInput.value = ''

    if (newMs) {
      milestones.push(newMs)

      // Add to the select dropdown
      const msSelect = addMsInput.closest('.step-detail__section')?.querySelector('.step-detail__milestone-select')
      if (msSelect) {
        const opt = document.createElement('option')
        opt.value = newMs.id
        opt.textContent = newMs.name
        opt.selected = true
        msSelect.append(opt)
      }

      // Link the step to the new milestone
      await updateStepMilestone(stepId, newMs.id)
    }
    return
  }
})

// Milestone select change in detail view
itemsContainer.addEventListener('change', (event) => {
  const select = event.target.closest('.step-detail__milestone-select')
  if (!select) return

  const stepId = select.dataset.stepId
  const milestoneId = select.value || null
  updateStepMilestone(stepId, milestoneId)
})

// Close expanded detail views on Escape
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  itemsContainer.querySelectorAll('.step-detail:not([hidden])').forEach((d) => {
    d.hidden = true
    d.closest('.todo-item')?.classList.remove('is-expanded')
  })
})

// ─── Init ───────────────────────────────────────────────────────────────────

hydrateIcons()

onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null
  updateHeaderForUser(session?.user ?? null)
  steps = []
  paths = []
  milestones = []
  stepPathsMap = new Map()
  renderedIds.clear()
  loadAllPaths()
  loadAllMilestones()
  loadSteps()
})

async function init() {
  const { data } = await getSession()
  if (!data.session) {
    const { error } = await signInAnonymously()
    if (error) {
      console.error('Failed to sign in anonymously:', error.message)
    }
  } else {
    currentUserId = data.session.user.id
    updateHeaderForUser(data.session.user)
  }

  await Promise.all([loadJourneys(), loadAllPaths(), loadAllMilestones()])

  if (data.session) {
    loadSteps()
  }
}

init()

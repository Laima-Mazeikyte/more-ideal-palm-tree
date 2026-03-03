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
import { loadMilestones, createMilestone, calculateProgress } from './milestones.js'
import { renderWeekView } from './week-view.js'

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

const pathPickerRoot = document.querySelector('.path-picker')
const pathPickerTrigger = document.querySelector('.path-picker__trigger')
const pathPickerDropdown = document.querySelector('.path-picker__dropdown')
const pathPickerOptions = document.querySelector('.path-picker__options')
const pathPickerLabel = document.querySelector('.path-picker__label')
const pathPickerCreateInput = document.querySelector('.path-picker__create-input')

const milestonePickerRoot = document.querySelector('.milestone-picker')
const milestonePickerTrigger = document.querySelector('.milestone-picker__trigger')
const milestonePickerDropdown = document.querySelector('.milestone-picker__dropdown')
const milestonePickerOptions = document.querySelector('.milestone-picker__options')
const milestonePickerLabel = document.querySelector('.milestone-picker__label')
const milestonePickerCreateInput = document.querySelector('.milestone-picker__create-input')

const weekViewContainer = document.querySelector('.week-view')

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
let paths = []
let milestones = []
let stepPathsMap = new Map()
let selectedJourneyId = null
let selectedPathId = null
let selectedMilestoneId = null
let currentUserId = null
let isAnonymousUser = true
const renderedIds = new Set()
let authMode = 'signup' // 'signup' | 'signin'

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

// ─── Journey Picker (form) ───────────────────────────────────────────────────

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

  // Milestone picker is filtered by journey — reset and repopulate
  selectedMilestoneId = null
  populateMilestonePicker()

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

// ─── Path Picker (form) ──────────────────────────────────────────────────────

function populatePathPicker() {
  if (!pathPickerOptions) return
  pathPickerOptions.replaceChildren()

  for (const path of paths) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'path-picker__option'
    option.setAttribute('role', 'option')
    option.dataset.pathId = path.id
    option.setAttribute('aria-selected', String(path.id === selectedPathId))

    const label = document.createElement('span')
    label.className = 'path-picker__option-label'
    label.textContent = path.name

    const checkIcon = document.createElement('i')
    checkIcon.dataset.lucide = 'check'
    checkIcon.className = 'path-picker__option-check'

    option.append(label, checkIcon)
    pathPickerOptions.append(option)
  }

  // Add a "None" option to deselect
  if (paths.length > 0) {
    const none = document.createElement('button')
    none.type = 'button'
    none.className = 'path-picker__option path-picker__option--none'
    none.setAttribute('role', 'option')
    none.dataset.pathId = ''
    none.setAttribute('aria-selected', String(!selectedPathId))

    const label = document.createElement('span')
    label.className = 'path-picker__option-label'
    label.textContent = 'None'
    none.append(label)
    pathPickerOptions.prepend(none)
  }

  hydrateIcons()
  updatePathTriggerDisplay()
}

function selectPath(pathId) {
  selectedPathId = pathId || null
  updatePathTriggerDisplay()

  if (!pathPickerOptions) return
  pathPickerOptions.querySelectorAll('.path-picker__option').forEach((opt) => {
    const optPathId = opt.dataset.pathId
    opt.setAttribute('aria-selected', String(optPathId === (selectedPathId ?? '')))
  })
}

function updatePathTriggerDisplay() {
  const path = paths.find((p) => p.id === selectedPathId)
  if (pathPickerLabel) pathPickerLabel.textContent = path?.name ?? 'Path'
  if (pathPickerTrigger) {
    pathPickerTrigger.classList.toggle('is-selected', !!path)
  }
}

function openPathPicker() {
  if (!pathPickerDropdown || !pathPickerTrigger) return
  pathPickerDropdown.hidden = false
  pathPickerTrigger.setAttribute('aria-expanded', 'true')
  pathPickerTrigger.classList.add('is-open')
}

function closePathPicker() {
  if (!pathPickerDropdown || !pathPickerTrigger) return
  pathPickerDropdown.hidden = true
  pathPickerTrigger.setAttribute('aria-expanded', 'false')
  pathPickerTrigger.classList.remove('is-open')
}

// ─── Path Picker Events ──────────────────────────────────────────────────────

pathPickerTrigger?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  event.stopPropagation()
  closeJourneyPicker()
  closeMilestonePicker()
  closeAllItemJourneyPickers()
  if (pathPickerDropdown?.hidden) {
    openPathPicker()
  } else {
    closePathPicker()
  }
})

pathPickerOptions?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  const option = event.target.closest('.path-picker__option')
  if (!option) return
  selectPath(option.dataset.pathId)
  closePathPicker()
})

pathPickerCreateInput?.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  const name = pathPickerCreateInput.value.trim()
  if (!name || !currentUserId || isAnonymousUser) return

  pathPickerCreateInput.disabled = true
  const newPath = await createPath(name, currentUserId)
  pathPickerCreateInput.disabled = false
  pathPickerCreateInput.value = ''

  if (newPath) {
    paths.push(newPath)
    populatePathPicker()
    selectPath(newPath.id)
    closePathPicker()
  }
})

// ─── Milestone Picker (form) ─────────────────────────────────────────────────

function populateMilestonePicker() {
  if (!milestonePickerOptions) return
  milestonePickerOptions.replaceChildren()

  // Filter milestones by currently selected journey
  const filtered = milestones.filter((m) => m.journey_id === selectedJourneyId)

  for (const ms of filtered) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'milestone-picker__option'
    option.setAttribute('role', 'option')
    option.dataset.milestoneId = ms.id
    option.setAttribute('aria-selected', String(ms.id === selectedMilestoneId))

    const label = document.createElement('span')
    label.className = 'milestone-picker__option-label'
    label.textContent = ms.name

    const checkIcon = document.createElement('i')
    checkIcon.dataset.lucide = 'check'
    checkIcon.className = 'milestone-picker__option-check'

    option.append(label, checkIcon)
    milestonePickerOptions.append(option)
  }

  // "None" option
  if (filtered.length > 0) {
    const none = document.createElement('button')
    none.type = 'button'
    none.className = 'milestone-picker__option milestone-picker__option--none'
    none.setAttribute('role', 'option')
    none.dataset.milestoneId = ''
    none.setAttribute('aria-selected', String(!selectedMilestoneId))

    const label = document.createElement('span')
    label.className = 'milestone-picker__option-label'
    label.textContent = 'None'
    none.append(label)
    milestonePickerOptions.prepend(none)
  }

  hydrateIcons()
  updateMilestoneTriggerDisplay()
}

function selectMilestone(milestoneId) {
  selectedMilestoneId = milestoneId || null
  updateMilestoneTriggerDisplay()

  if (!milestonePickerOptions) return
  milestonePickerOptions.querySelectorAll('.milestone-picker__option').forEach((opt) => {
    const optId = opt.dataset.milestoneId
    opt.setAttribute('aria-selected', String(optId === (selectedMilestoneId ?? '')))
  })
}

function updateMilestoneTriggerDisplay() {
  const ms = milestones.find((m) => m.id === selectedMilestoneId)
  if (milestonePickerLabel) milestonePickerLabel.textContent = ms?.name ?? 'Milestone'
  if (milestonePickerTrigger) {
    milestonePickerTrigger.classList.toggle('is-selected', !!ms)
  }
}

function updateAuthDependentUI() {
  if (pathPickerRoot) {
    pathPickerRoot.classList.toggle('is-hidden', isAnonymousUser)
  }
  if (milestonePickerRoot) {
    milestonePickerRoot.classList.toggle('is-hidden', isAnonymousUser)
  }
}

function openMilestonePicker() {
  if (!milestonePickerDropdown || !milestonePickerTrigger) return
  milestonePickerDropdown.hidden = false
  milestonePickerTrigger.setAttribute('aria-expanded', 'true')
  milestonePickerTrigger.classList.add('is-open')
}

function closeMilestonePicker() {
  if (!milestonePickerDropdown || !milestonePickerTrigger) return
  milestonePickerDropdown.hidden = true
  milestonePickerTrigger.setAttribute('aria-expanded', 'false')
  milestonePickerTrigger.classList.remove('is-open')
}

// ─── Milestone Picker Events ─────────────────────────────────────────────────

milestonePickerTrigger?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  event.stopPropagation()
  closeJourneyPicker()
  closePathPicker()
  closeAllItemJourneyPickers()
  if (milestonePickerDropdown?.hidden) {
    openMilestonePicker()
  } else {
    closeMilestonePicker()
  }
})

milestonePickerOptions?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  const option = event.target.closest('.milestone-picker__option')
  if (!option) return
  selectMilestone(option.dataset.milestoneId)
  closeMilestonePicker()
})

milestonePickerCreateInput?.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  const name = milestonePickerCreateInput.value.trim()
  if (!name || !currentUserId || !selectedJourneyId || isAnonymousUser) return

  milestonePickerCreateInput.disabled = true
  const newMs = await createMilestone(selectedJourneyId, name, currentUserId)
  milestonePickerCreateInput.disabled = false
  milestonePickerCreateInput.value = ''

  if (newMs) {
    milestones.push(newMs)
    populateMilestonePicker()
    selectMilestone(newMs.id)
    closeMilestonePicker()
  }
})

// ─── Item Journey Pickers ─────────────────────────────────────────────────────

function closeAllItemJourneyPickers() {
  itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((dropdown) => {
    dropdown.hidden = true
    dropdown
      .closest('.journey-picker')
      ?.querySelector('.journey-picker__item-trigger')
      ?.classList.remove('is-open')
  })
}

// ─── Journey Picker Events ────────────────────────────────────────────────────

journeyPickerTrigger?.addEventListener('click', (event) => {
  event.stopPropagation()
  closeAllItemJourneyPickers()
  closePathPicker()
  closeMilestonePicker()
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

// Close pickers when clicking outside
document.addEventListener('click', (event) => {
  // Close form journey picker
  if (journeyPickerDropdown && !journeyPickerDropdown.hidden) {
    const picker = journeyPickerTrigger?.closest('.journey-picker')
    if (picker && !picker.contains(event.target)) {
      closeJourneyPicker()
    }
  }
  // Close form path picker
  if (pathPickerDropdown && !pathPickerDropdown.hidden) {
    const picker = pathPickerTrigger?.closest('.path-picker')
    if (picker && !picker.contains(event.target)) {
      closePathPicker()
    }
  }
  // Close form milestone picker
  if (milestonePickerDropdown && !milestonePickerDropdown.hidden) {
    const picker = milestonePickerTrigger?.closest('.milestone-picker')
    if (picker && !picker.contains(event.target)) {
      closeMilestonePicker()
    }
  }
  // Close any item journey pickers not containing the click target
  itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((dropdown) => {
    const picker = dropdown.closest('.journey-picker')
    if (picker && !picker.contains(event.target)) {
      dropdown.hidden = true
      picker.querySelector('.journey-picker__item-trigger')?.classList.remove('is-open')
    }
  })
})

// Close pickers on Escape
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  if (journeyPickerDropdown && !journeyPickerDropdown.hidden) {
    closeJourneyPicker()
    journeyPickerTrigger?.focus()
  }
  if (pathPickerDropdown && !pathPickerDropdown.hidden) {
    closePathPicker()
    pathPickerTrigger?.focus()
  }
  if (milestonePickerDropdown && !milestonePickerDropdown.hidden) {
    closeMilestonePicker()
    milestonePickerTrigger?.focus()
  }
  closeAllItemJourneyPickers()
})

// ─── Render ─────────────────────────────────────────────────────────────────

function buildItemJourneyPicker(step) {
  const journey = step.journeys

  const wrapper = document.createElement('div')
  wrapper.className = 'journey-picker todo-item__journey-picker'

  const badge = document.createElement('button')
  badge.type = 'button'
  badge.className = 'todo-item__journey-badge journey-picker__item-trigger'
  badge.textContent = journey?.name ?? ''
  badge.dataset.stepId = step.id
  if (journey?.slug) badge.dataset.journeySlug = journey.slug
  badge.setAttribute('aria-label', `Change journey for "${step.text}"`)
  badge.setAttribute('aria-haspopup', 'listbox')

  const dropdown = document.createElement('div')
  dropdown.className = 'journey-picker__dropdown'
  dropdown.setAttribute('role', 'listbox')
  dropdown.hidden = true

  for (const j of journeys) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'journey-picker__option'
    option.setAttribute('role', 'option')
    option.setAttribute('aria-selected', String(j.id === step.journey_id))
    option.dataset.journeyId = j.id
    option.dataset.stepId = step.id

    const dot = document.createElement('span')
    dot.className = 'journey-picker__option-dot'
    dot.setAttribute('aria-hidden', 'true')
    dot.dataset.journeySlug = j.slug

    const label = document.createElement('span')
    label.className = 'journey-picker__option-label'
    label.textContent = j.name

    const checkIcon = document.createElement('i')
    checkIcon.dataset.lucide = 'check'
    checkIcon.className = 'journey-picker__option-check'

    option.append(dot, label, checkIcon)
    dropdown.append(option)
  }

  wrapper.append(badge, dropdown)
  return wrapper
}

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

function groupStepsByJourney(stepsList) {
  const groups = new Map()
  for (const step of stepsList) {
    const slug = step.journeys?.slug ?? '_none'
    if (!groups.has(slug)) {
      groups.set(slug, {
        journey: step.journeys,
        steps: [],
      })
    }
    groups.get(slug).steps.push(step)
  }
  // Sort groups by journey sort_order (fall back to order of first appearance)
  const sorted = [...groups.values()]
  sorted.sort((a, b) => {
    const aOrder = journeys.findIndex((j) => j.slug === a.journey?.slug)
    const bOrder = journeys.findIndex((j) => j.slug === b.journey?.slug)
    return aOrder - bOrder
  })
  return sorted
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

  const groups = groupStepsByJourney(steps)

  for (const group of groups) {
    const journey = group.journey

    // Journey group header
    const header = document.createElement('div')
    header.className = 'journey-group__header'
    if (journey?.slug) header.dataset.journeySlug = journey.slug

    const dot = document.createElement('span')
    dot.className = 'journey-group__dot'
    dot.setAttribute('aria-hidden', 'true')
    if (journey?.slug) dot.dataset.journeySlug = journey.slug

    const name = document.createElement('span')
    name.className = 'journey-group__name'
    name.textContent = journey?.name ?? 'Uncategorized'

    const count = document.createElement('span')
    count.className = 'journey-group__count'
    count.textContent = group.steps.length

    header.append(dot, name, count)
    itemsContainer.append(header)

    // Steps within group
    for (const step of group.steps) {
      const item = document.createElement('article')
      item.className = 'todo-item'
      if (step.completed) item.classList.add('is-completed')
      if (journey?.slug) item.dataset.journeySlug = journey.slug
      item.dataset.stepId = step.id

      const isNew = !renderedIds.has(step.id)
      if (isNew) {
        item.classList.add('is-new')
        renderedIds.add(step.id)
      }

      // Layer 1: Journey dot + title + timestamp
      const tileDot = document.createElement('span')
      tileDot.className = 'todo-item__dot'
      tileDot.setAttribute('aria-hidden', 'true')
      if (journey?.slug) tileDot.dataset.journeySlug = journey.slug

      const text = document.createElement('p')
      text.className = 'todo-item__text'
      text.textContent = step.text

      const timestamp = document.createElement('time')
      timestamp.className = 'todo-item__timestamp'
      timestamp.textContent = formatStepTime(step.created_at)
      if (step.created_at) timestamp.setAttribute('datetime', step.created_at)

      // Path badges (only shown if step has path associations)
      const stepPaths = stepPathsMap.get(step.id)
      let pathBadgesEl = null
      if (stepPaths && stepPaths.length > 0) {
        pathBadgesEl = document.createElement('div')
        pathBadgesEl.className = 'todo-item__paths'
        for (const p of stepPaths) {
          const badge = document.createElement('span')
          badge.className = 'todo-item__path-badge'
          badge.textContent = p.name
          pathBadgesEl.append(badge)
        }
      }

      const actions = document.createElement('div')
      actions.className = 'todo-item__actions'

      const itemPicker = buildItemJourneyPicker(step)

      const deleteButton = document.createElement('button')
      deleteButton.className = 'todo-item__delete-button'
      deleteButton.type = 'button'
      deleteButton.dataset.todoId = step.id
      deleteButton.setAttribute('aria-label', `Delete "${step.text}"`)

      const icon = document.createElement('i')
      icon.dataset.lucide = 'x'
      deleteButton.append(icon)

      actions.append(itemPicker, deleteButton)
      item.append(tileDot, text, timestamp, actions)

      // Metadata row: path badges + milestone progress (below main content)
      const hasPaths = pathBadgesEl != null
      const milestone = step.milestones
      const hasMilestone = milestone && milestone.target_count

      if (hasPaths || hasMilestone) {
        const metaRow = document.createElement('div')
        metaRow.className = 'todo-item__meta'

        if (pathBadgesEl) metaRow.append(pathBadgesEl)

        if (hasMilestone) {
          // Count completed steps toward this milestone
          const stepsInMilestone = steps.filter((s) => s.milestone_id === milestone.id)
          const progress = calculateProgress(milestone, stepsInMilestone)

          const milestoneEl = document.createElement('div')
          milestoneEl.className = 'todo-item__milestone'

          const msName = document.createElement('span')
          msName.className = 'todo-item__milestone-name'
          msName.textContent = milestone.name

          const bar = document.createElement('div')
          bar.className = 'milestone-bar'
          if (journey?.slug) bar.dataset.journeySlug = journey.slug

          const fill = document.createElement('div')
          fill.className = 'milestone-bar__fill'
          fill.style.width = `${(progress.percentage ?? 0) * 100}%`

          bar.append(fill)
          milestoneEl.append(msName, bar)
          metaRow.append(milestoneEl)
        }

        item.append(metaRow)
      }

      itemsContainer.append(item)
    }
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

async function loadAllPaths() {
  paths = await loadPaths()
  populatePathPicker()
}

async function loadAllMilestones() {
  milestones = await loadMilestones()
  populateMilestonePicker()
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
  if (selectedMilestoneId) insertPayload.milestone_id = selectedMilestoneId

  // #region agent log
  fetch('http://127.0.0.1:7751/ingest/dadd5b2c-2a27-4e1b-97eb-f234832b59d2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '9f04a6',
    },
    body: JSON.stringify({
      sessionId: '9f04a6',
      runId: 'initial',
      hypothesisId: 'H1-H3',
      location: 'main.js:821',
      message: 'addStep called',
      data: {
        textLength: typeof text === 'string' ? text.length : null,
        hasText: !!text,
        journeyId,
        currentUserId,
        selectedMilestoneId,
        selectedPathId,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  const { data, error } = await supabase
    .from('steps')
    .insert(insertPayload)
    .select('*, journeys(id, name, slug), milestones(id, name, target_count)')
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7751/ingest/dadd5b2c-2a27-4e1b-97eb-f234832b59d2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '9f04a6',
    },
    body: JSON.stringify({
      sessionId: '9f04a6',
      runId: 'initial',
      hypothesisId: 'H1-H3',
      location: 'main.js:829',
      message: 'addStep insert result',
      data: {
        hasError: !!error,
        errorMessage: error?.message ?? null,
        errorCode: error?.code ?? null,
        stepId: data?.id ?? null,
        journeyId: data?.journey_id ?? null,
        milestoneId: data?.milestone_id ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  if (error) {
    console.error('Failed to add step:', error.message)
    return
  }

  try {
    // Associate with selected path if any, but never block rendering the new step
    if (selectedPathId) {
      const ok = await addStepToPath(data.id, selectedPathId)
      // #region agent log
      fetch('http://127.0.0.1:7751/ingest/dadd5b2c-2a27-4e1b-97eb-f234832b59d2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '9f04a6',
        },
        body: JSON.stringify({
          sessionId: '9f04a6',
          runId: 'initial',
          hypothesisId: 'H4',
          location: 'main.js:843',
          message: 'addStepToPath result',
          data: {
            ok,
            stepId: data.id,
            selectedPathId,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      if (ok) {
        const path = paths.find((p) => p.id === selectedPathId)
        if (path) {
          stepPathsMap.set(data.id, [{ id: path.id, name: path.name }])
        }
      }
    }
  } catch (assocError) {
    console.error('Failed to associate step with path:', assocError)
    // #region agent log
    fetch('http://127.0.0.1:7751/ingest/dadd5b2c-2a27-4e1b-97eb-f234832b59d2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '9f04a6',
      },
      body: JSON.stringify({
        sessionId: '9f04a6',
        runId: 'initial',
        hypothesisId: 'H4',
        location: 'main.js:851',
        message: 'addStepToPath threw',
        data: {
          errorMessage: assocError?.message ?? String(assocError),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
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
  renderSteps()
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
    const { data: signUpData, error } = await signUp(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }
    // If email confirmation is required, the user object will have
    // an unconfirmed email. Let them know to check their inbox.
    if (signUpData?.user?.email && !signUpData?.user?.email_confirmed_at) {
      showAuthError('Check your email to confirm your account.')
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

  // Item journey picker trigger (the badge button)
  const itemTrigger = target.closest('.journey-picker__item-trigger')
  if (itemTrigger instanceof HTMLButtonElement) {
    event.stopPropagation()
    closeJourneyPicker()
    const picker = itemTrigger.closest('.journey-picker')
    const dropdown = picker?.querySelector('.journey-picker__dropdown')
    if (!dropdown) return

    // Close all other open item dropdowns
    itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((d) => {
      if (d !== dropdown) {
        d.hidden = true
        d.closest('.journey-picker')?.querySelector('.journey-picker__item-trigger')?.classList.remove('is-open')
      }
    })

    if (dropdown.hidden) {
      dropdown.hidden = false
      itemTrigger.classList.add('is-open')
    } else {
      dropdown.hidden = true
      itemTrigger.classList.remove('is-open')
    }
    return
  }

  // Item journey option
  const journeyOption = target.closest('.journey-picker__option[data-step-id]')
  if (journeyOption instanceof HTMLButtonElement) {
    const journeyId = journeyOption.dataset.journeyId
    const stepId = journeyOption.dataset.stepId
    if (!journeyId || !stepId) return

    const dropdown = journeyOption.closest('.journey-picker__dropdown')
    if (dropdown) {
      dropdown.hidden = true
      dropdown
        .closest('.journey-picker')
        ?.querySelector('.journey-picker__item-trigger')
        ?.classList.remove('is-open')
    }

    updateStepJourney(stepId, journeyId)
    return
  }

  // Toggle completion by clicking the tile body (saturation-based, no checkbox)
  const tile = target.closest('.todo-item')
  if (!tile) return
  // Don't toggle if clicking actions area
  if (target.closest('.todo-item__actions')) return

  const id = tile.dataset.stepId
  const step = steps.find((s) => s.id === id)
  if (!step) return

  step.completed = !step.completed
  renderSteps()
  toggleStep(id, step.completed)
})

// ─── Init ───────────────────────────────────────────────────────────────────

hydrateIcons()

onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null
  updateHeaderForUser(session?.user ?? null)
  updateAuthDependentUI()
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
      // Still try to load journeys/steps in case RLS allows it
    }
    // onAuthStateChange will fire → loadSteps()
  } else {
    currentUserId = data.session.user.id
    updateHeaderForUser(data.session.user)
  }

  // Load journeys, paths, and milestones after auth so RLS filters by the authenticated user
  await loadJourneys()
  await loadAllPaths()
  await loadAllMilestones()

  // If we already had a session (no onAuthStateChange fired), load steps now
  if (data.session) {
    loadSteps()
  }

  updateAuthDependentUI()
}

init()

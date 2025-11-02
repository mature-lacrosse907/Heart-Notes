/**
 * 卡片管理模块
 * 负责卡片的创建、交互、动画等核心功能
 */

import { CONFIG } from './config.js'
import { randomFrom, clamp, applyTransform, isMobileDevice } from './utils.js'
import { stateManager } from './stateManager.js'
import { themeManager } from './themeManager.js'

/**
 * 卡片管理器
 */
export class CardManager {
	constructor(boardElement) {
		this.board = boardElement
		this.isMobile = isMobileDevice()
		this.heartPositions = CONFIG.LAYOUT.getHeartPositions()
		this.currentPositionIndex = 0
		const initialWidth = this.isMobile
			? CONFIG.CARD.MOBILE_WIDTH
			: CONFIG.CARD.DESKTOP_WIDTH
		const initialHeight = this.isMobile
			? CONFIG.CARD.MOBILE_HEIGHT
			: CONFIG.CARD.DESKTOP_HEIGHT
		this.cardMetrics = {
			width: initialWidth,
			height: initialHeight,
			sampleCount: 0
		}
		this._layoutCache = null
	}

	/**
	 * 创建新卡片
	 */
    createCard() {
        if (CONFIG.DEBUG) {
            console.log(`创建卡片前: 活动卡片数 = ${stateManager.getActiveCardCount()}`)
        }

		const card = document.createElement('div')
		card.className = 'card'

		// 彩蛋：判断是否是最后两张卡片（第160和161张）
		const currentCount = stateManager.getActiveCardCount()
		const maxCards = CONFIG.LIMITS.MAX_CARDS_DESKTOP
		const isSecondLastCard = currentCount === maxCards - 2
		const isLastCard = currentCount === maxCards - 1

		// 随机选择颜色和消息，最后两张卡片使用彩蛋文案
		// 根据当前主题选择颜色索引
		const colors = themeManager.getColors()
		const colorIndex = Math.floor(Math.random() * colors.length)
		let message
		if (isSecondLastCard) {
			message = CONFIG.LAYOUT.EASTER_EGG_MESSAGES[0]
		} else if (isLastCard) {
			message = CONFIG.LAYOUT.EASTER_EGG_MESSAGES[1]
		} else {
			message = randomFrom(CONFIG.MESSAGES)
		}

			// 计算位置参数
			const layout = this.computeLayoutGeometry()
			const {
				cardWidth,
				cardHeight,
				horizontalMargin,
				verticalMargin,
				scale,
				centerOffsetX,
				centerOffsetY,
				verticalOffsetRatio,
				verticalDelta
			} = layout

		let left, top
		let jitterX = 0
		let jitterY = 0

		// 使用爱心形状布局或随机布局
		if (CONFIG.LAYOUT.USE_HEART_SHAPE) {
				const position = this.heartPositions[this.currentPositionIndex % this.heartPositions.length]
				left = centerOffsetX + position.x * scale
				top = centerOffsetY + (position.y + verticalOffsetRatio) * scale + verticalDelta

			// 添加一些随机偏移，让卡片看起来更自然、更密集
			const randomOffset = this.isMobile ? 8 : 15
			jitterX = (Math.random() - 0.5) * randomOffset
			jitterY = 0 // 保持垂直方向稳定，确保爱心上下对称
			left += jitterX
			top += jitterY

			// 循环使用位置
			this.currentPositionIndex++
		} else {
			// 随机生成位置
			left =
				horizontalMargin +
				Math.random() *
					Math.max(window.innerWidth - cardWidth - horizontalMargin * 2, 0)
			top =
				verticalMargin +
				Math.random() *
					Math.max(window.innerHeight - cardHeight - verticalMargin * 2, 0)
		}

		// 不旋转，保持水平以便识别爱心形状
		const angle = 0

		// 设置样式 - 使用颜色类而不是直接设置背景色
		card.classList.add(`color-${colorIndex}`)
		card.style.left = `${left}px`
		card.style.top = `${top}px`

		// 设置HTML内容
		card.innerHTML = `
			<div class="card-header">
				<div class="window-controls">
					<button class="control close" type="button" aria-label="关闭"></button>
					<span class="control minimize"></span>
					<span class="control maximize"></span>
				</div>
				<div class="card-title">温馨提示</div>
			</div>
			<div class="card-body">${message}</div>
		`

		// 初始化卡片状态
		const initialScale = this.isMobile
			? CONFIG.SCALE.INITIAL_MOBILE
			: CONFIG.SCALE.INITIAL_DESKTOP

		stateManager.initCardState(card, {
			angle,
			scale: initialScale,
			translateX: 0,
			translateY: 0,
			left,
			top,
			lastPosition: { left, top },
			randomJitterX: jitterX,
			randomJitterY: jitterY
		})

		// 应用初始transform
		const state = stateManager.getCardState(card)
		applyTransform(card, {
			scale: state.scale,
			rotate: state.angle
		})

		// 添加到DOM
		this.board.appendChild(card)
		stateManager.bringToFront(card)

		// 存储尺寸
		const measuredWidth = card.offsetWidth
		const measuredHeight = card.offsetHeight

		stateManager.updateCardState(card, {
			width: measuredWidth,
			height: measuredHeight
		})

		this.updateCardMetrics(measuredWidth, measuredHeight)

		// 入场动画
		requestAnimationFrame(() => {
			stateManager.updateCardState(card, { scale: CONFIG.SCALE.NORMAL })
			applyTransform(card, {
				scale: CONFIG.SCALE.NORMAL,
				rotate: state.angle
			})
			card.style.opacity = '1'
		})

		// 绑定交互事件
		this.setupInteractions(card)

		// 限制卡片数量
		this.limitCardCount()

        if (CONFIG.DEBUG) {
            console.log(`创建卡片后: 活动卡片数 = ${stateManager.getActiveCardCount()}`)
        }
	}

	updateCardMetrics(width, height) {
		if (!Number.isFinite(width) || !Number.isFinite(height)) return

		const metrics = this.cardMetrics
		const prevWidth = metrics.width
		const prevHeight = metrics.height
		const prevCount = metrics.sampleCount || 0
		const nextCount = prevCount + 1

		const newWidth = prevWidth + (width - prevWidth) / nextCount
		const newHeight = prevHeight + (height - prevHeight) / nextCount

		metrics.width = newWidth
		metrics.height = newHeight
		metrics.sampleCount = nextCount
		this._layoutCache = null
	}

	refreshMetricsFromDom() {
		const cards = this.board.querySelectorAll('.card')
		if (!cards.length) {
			this.cardMetrics = {
				width: this.isMobile ? CONFIG.CARD.MOBILE_WIDTH : CONFIG.CARD.DESKTOP_WIDTH,
				height: this.isMobile ? CONFIG.CARD.MOBILE_HEIGHT : CONFIG.CARD.DESKTOP_HEIGHT,
				sampleCount: 0
			}
			this._layoutCache = null
			return
		}

		let sumWidth = 0
		let sumHeight = 0
		cards.forEach(card => {
			sumWidth += card.offsetWidth
			sumHeight += card.offsetHeight
		})

		const avgWidth = sumWidth / cards.length
		const avgHeight = sumHeight / cards.length

		if (Number.isFinite(avgWidth)) this.cardMetrics.width = avgWidth
		if (Number.isFinite(avgHeight)) this.cardMetrics.height = avgHeight
		this.cardMetrics.sampleCount = cards.length
		this._layoutCache = null
	}

	/**
	 * 限制卡片数量，删除最旧的卡片
	 */
	limitCardCount() {
		const maxCards = this.isMobile
			? CONFIG.LIMITS.MAX_CARDS_MOBILE
			: CONFIG.LIMITS.MAX_CARDS_DESKTOP

		// 当卡片数量达到或超过限制时，删除最旧的卡片
		let deleted = 0
            while (stateManager.getActiveCardCount() > maxCards) {
                const oldest = this.board.firstElementChild
                if (oldest && oldest.classList.contains('card')) {
                    if (CONFIG.DEBUG) {
                        console.log(`删除最旧的卡片，当前数量: ${stateManager.getActiveCardCount()}`)
                    }
                    this.removeCard(oldest)
                    deleted++
                    if (deleted > 10) {
                        if (CONFIG.DEBUG) console.error('删除卡片过多，强制停止')
                        break // 防止无限循环
                    }
                } else {
                    break // 防止无限循环
                }
		}
	}

	/**
	 * 设置卡片交互事件
	 * @param {HTMLElement} card - 卡片元素
	 */
	setupInteractions(card) {
		const header = card.querySelector('.card-header')
		const closeBtn = card.querySelector('.control.close')

		// 防止快速重复点击
		let isProcessing = false

		closeBtn.addEventListener('click', event => {
			event.stopPropagation()
			if (!isProcessing) {
				isProcessing = true
				this.closeCard(card)
			}
		})

		// 拖拽事件（支持鼠标和触摸）
		header.addEventListener('pointerdown', event => {
			this.startDrag(event, card)
		})

		// 点击卡片置顶
		card.addEventListener('pointerdown', () => {
			stateManager.bringToFront(card)
		})
	}

	/**
	 * 开始拖拽（修复：支持触摸拖拽）
	 * @param {PointerEvent} event - 指针事件
	 * @param {HTMLElement} card - 卡片元素
	 */
	startDrag(event, card) {
		// 忽略按钮点击
		if (event.target.closest('.control')) return

		const state = stateManager.getCardState(card)
		if (!state || state.closing || state.maximized) return

		event.preventDefault()
		stateManager.bringToFront(card)

		const header = card.querySelector('.card-header')
		card.classList.add('dragging')
		header.classList.add('dragging')

		stateManager.updateCardState(card, {
			dragging: true,
			dragOffsetX: event.clientX - state.left,
			dragOffsetY: event.clientY - state.top
		})

		// 使用requestAnimationFrame节流拖拽更新
		let dragFrame = null
		let pendingLeft = state.left
		let pendingTop = state.top

		const commitDrag = () => {
			dragFrame = null
			const currentState = stateManager.getCardState(card)
			const cardWidth = currentState.width || card.offsetWidth
			const cardHeight = currentState.height || card.offsetHeight

			// 边界限制（允许少量超出）
			const overflowRatio = CONFIG.BOUNDARY.OVERFLOW_RATIO
			const maxLeft = window.innerWidth - cardWidth * (1 - overflowRatio)
			const maxTop = window.innerHeight - cardHeight * (1 - overflowRatio)
			const minLeft = -cardWidth * overflowRatio
			const minTop = -cardHeight * overflowRatio

			currentState.left = clamp(pendingLeft, minLeft, maxLeft)
			currentState.top = clamp(pendingTop, minTop, maxTop)

			card.style.left = `${currentState.left}px`
			card.style.top = `${currentState.top}px`
		}

		const handlePointerMove = moveEvent => {
			const currentState = stateManager.getCardState(card)
			if (!currentState || !currentState.dragging) return

			pendingLeft = moveEvent.clientX - currentState.dragOffsetX
			pendingTop = moveEvent.clientY - currentState.dragOffsetY

			if (dragFrame === null) {
				dragFrame = requestAnimationFrame(commitDrag)
			}
		}

		const handlePointerUp = () => {
			const currentState = stateManager.getCardState(card)
			if (currentState) {
				currentState.dragging = false
				currentState.lastPosition = {
					left: currentState.left,
					top: currentState.top
				}
			}

			card.classList.remove('dragging')
			header.classList.remove('dragging')

			if (dragFrame !== null) {
				cancelAnimationFrame(dragFrame)
				commitDrag()
			}

			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}

		document.addEventListener('pointermove', handlePointerMove)
		document.addEventListener('pointerup', handlePointerUp)
	}

	/**
	 * 关闭卡片（修复：完整清理事件和状态）
	 * @param {HTMLElement} card - 卡片元素
	 */
	closeCard(card) {
		const state = stateManager.getCardState(card)
		if (!state || state.closing) return

		stateManager.updateCardState(card, { closing: true, scale: CONFIG.SCALE.MINIMIZED })

		const currentState = stateManager.getCardState(card)
		applyTransform(card, {
			scale: currentState.scale,
			rotate: currentState.angle
		})
		card.style.opacity = '0'

		const handleTransitionEnd = event => {
			if (event.propertyName === 'opacity') {
				card.removeEventListener('transitionend', handleTransitionEnd)
				this.removeCard(card)
			}
		}

		card.addEventListener('transitionend', handleTransitionEnd)
	}

	/**
	 * 移除卡片并清理资源（修复内存泄漏）
	 * @param {HTMLElement} card - 卡片元素
	 */
	removeCard(card) {
		// 清理状态管理器中的引用
		stateManager.cleanupCard(card)

		// 从DOM中移除
		card.remove()
		this.refreshMetricsFromDom()
	}

	/**
	 * 最小化卡片
	 * @param {HTMLElement} card - 卡片元素
	 */
	minimizeCard(card) {
		const state = stateManager.getCardState(card)
		if (!state || state.closing) return

		const runMinimize = () => {
			stateManager.updateCardState(card, { closing: true })
			stateManager.bringToFront(card)

			const cardWidth = state.width || card.offsetWidth
			const bottom = Math.max(window.innerHeight - 24, 0)
			const targetLeft = clamp(
				state.left,
				16,
				Math.max(window.innerWidth - cardWidth - 16, 16)
			)

			stateManager.updateCardState(card, {
				left: targetLeft,
				top: bottom,
				scale: CONFIG.SCALE.MINIMIZED,
				angle: 0
			})

			const currentState = stateManager.getCardState(card)
			card.style.left = `${currentState.left}px`
			card.style.top = `${currentState.top}px`
			card.style.opacity = '0.35'
			applyTransform(card, {
				scale: currentState.scale,
				rotate: 0
			})

			const handleTransitionEnd = event => {
				if (event.propertyName === 'transform') {
					card.removeEventListener('transitionend', handleTransitionEnd)
					this.removeCard(card)
				}
			}

			card.addEventListener('transitionend', handleTransitionEnd)
		}

		// 如果是全屏状态，先恢复再最小化
		if (state.maximized) {
			stateManager.clearMaximizedCard(card)
			card.classList.remove('maximized')
			card.style.borderRadius = `${CONFIG.CARD.BORDER_RADIUS}px`

			stateManager.updateCardState(card, {
				left: 0,
				top: 0,
				scale: CONFIG.SCALE.NORMAL,
				angle: 0
			})

			const currentState = stateManager.getCardState(card)
			applyTransform(card, {
				scale: currentState.scale,
				rotate: 0
			})

			requestAnimationFrame(() => {
				requestAnimationFrame(runMinimize)
			})
			return
		}

		runMinimize()
	}

	/**
	 * 切换全屏状态
	 * @param {HTMLElement} card - 卡片元素
	 */
	toggleMaximize(card) {
		const state = stateManager.getCardState(card)
		if (!state || state.closing) return

		if (state.maximized) {
			this.restoreFromMaximize(card)
		} else {
			this.maximizeCard(card)
		}
	}

	/**
	 * 全屏卡片
	 * @param {HTMLElement} card - 卡片元素
	 */
	maximizeCard(card) {
		const state = stateManager.getCardState(card)

		// 保存全屏前的状态
		stateManager.updateCardState(card, {
			beforeMaximize: {
				left: state.left,
				top: state.top,
				scale: state.scale ?? CONFIG.SCALE.NORMAL,
				width: card.offsetWidth,
				height: card.offsetHeight,
				angle: state.angle ?? 0
			}
		})

		card.classList.add('maximized')
		card.style.left = '0px'
		card.style.top = '0px'
		card.style.width = `${window.innerWidth}px`
		card.style.height = `${window.innerHeight}px`
		card.style.borderRadius = '0'

		stateManager.updateCardState(card, {
			left: 0,
			top: 0,
			scale: CONFIG.SCALE.NORMAL,
			angle: 0
		})

		const currentState = stateManager.getCardState(card)
		applyTransform(card, {
			scale: currentState.scale,
			rotate: 0
		})

		stateManager.setMaximizedCard(card)
	}

	/**
	 * 从全屏恢复
	 * @param {HTMLElement} card - 卡片元素
	 */
	restoreFromMaximize(card) {
		const state = stateManager.getCardState(card)
		const previous = state.beforeMaximize
		if (!previous) return

		card.classList.remove('maximized')
		card.style.left = `${previous.left}px`
		card.style.top = `${previous.top}px`
		card.style.width = `${previous.width}px`
		card.style.height = `${previous.height}px`
		card.style.borderRadius = `${CONFIG.CARD.BORDER_RADIUS}px`

		stateManager.updateCardState(card, {
			left: previous.left,
			top: previous.top,
			scale: previous.scale ?? CONFIG.SCALE.NORMAL,
			angle: previous.angle ?? 0
		})

		const currentState = stateManager.getCardState(card)
		applyTransform(card, {
			scale: currentState.scale,
			rotate: currentState.angle
		})

		stateManager.clearMaximizedCard(card)
		stateManager.bringToFront(card)
		stateManager.updateCardState(card, {
			lastPosition: { left: currentState.left, top: currentState.top }
		})

		// 恢复原始尺寸（使用正确的时间）
		setTimeout(() => {
			const latestState = stateManager.getCardState(card)
			if (latestState && !latestState.maximized) {
				card.style.width = ''
				card.style.height = ''
				stateManager.updateCardState(card, {
					width: card.offsetWidth,
					height: card.offsetHeight
				})
			}
		}, CONFIG.ANIMATION.TRANSITION_DURATION + 10)
	}

	/**
	 * 更新移动端状态
	 */
	updateMobileState() {
		const wasMobile = this.isMobile
		this.isMobile = isMobileDevice()

		// 如果移动端状态改变，重新获取爱心位置
			if (wasMobile !== this.isMobile) {
				this.heartPositions = CONFIG.LAYOUT.getHeartPositions()
				this.cardMetrics = {
					width: this.isMobile ? CONFIG.CARD.MOBILE_WIDTH : CONFIG.CARD.DESKTOP_WIDTH,
					height: this.isMobile ? CONFIG.CARD.MOBILE_HEIGHT : CONFIG.CARD.DESKTOP_HEIGHT,
					sampleCount: 0
				}
				this._layoutCache = null
			// 切换布局后根据最新的DOM尺寸刷新基线
			const schedule = (fn) => {
				if (typeof requestAnimationFrame === 'function') {
					requestAnimationFrame(fn)
				} else {
					setTimeout(fn, 0)
				}
			}
			schedule(() => {
				this.refreshMetricsFromDom()
				this.relayoutCards()
			})
		}
	}

	/**
	 * 重新布局所有卡片（用于全屏切换等窗口尺寸变化）
	 */
	relayoutCards() {
		if (!CONFIG.LAYOUT.USE_HEART_SHAPE) return

		const cards = document.querySelectorAll('.card')
		if (cards.length === 0) return

		const {
			scale,
			centerOffsetX,
			centerOffsetY,
			verticalOffsetRatio,
			verticalDelta
		} = this.computeLayoutGeometry()

		cards.forEach((card, index) => {
			const state = stateManager.getCardState(card)
			if (!state || state.maximized || state.closing) return

			const position = this.heartPositions[index % this.heartPositions.length]
			const jitterX = state.randomJitterX ?? 0
			const jitterY = state.randomJitterY ?? 0

			const newLeft = centerOffsetX + position.x * scale + jitterX
			const newTop = centerOffsetY + (position.y + verticalOffsetRatio) * scale + verticalDelta + jitterY

			card.style.left = `${newLeft}px`
			card.style.top = `${newTop}px`

			stateManager.updateCardState(card, {
				left: newLeft,
				top: newTop,
				lastPosition: { left: newLeft, top: newTop }
			})
		})
	}

	computeLayoutGeometry() {
		if (this._layoutCache) return this._layoutCache

		const fallbackWidth = this.isMobile ? CONFIG.CARD.MOBILE_WIDTH : CONFIG.CARD.DESKTOP_WIDTH
		const fallbackHeight = this.isMobile ? CONFIG.CARD.MOBILE_HEIGHT : CONFIG.CARD.DESKTOP_HEIGHT
		const cardWidth = Number.isFinite(this.cardMetrics.width) ? this.cardMetrics.width : fallbackWidth
		const cardHeight = Number.isFinite(this.cardMetrics.height) ? this.cardMetrics.height : fallbackHeight
		const horizontalMargin = this.isMobile
			? CONFIG.SPACING.MOBILE_HORIZONTAL
			: CONFIG.SPACING.DESKTOP_HORIZONTAL
		const verticalMargin = this.isMobile
			? CONFIG.SPACING.MOBILE_VERTICAL
			: CONFIG.SPACING.DESKTOP_VERTICAL
		const verticalOffsetRatio = this.isMobile
			? CONFIG.LAYOUT.VERTICAL_OFFSET_MOBILE
			: CONFIG.LAYOUT.VERTICAL_OFFSET_DESKTOP

		const availableWidth = Math.max(window.innerWidth - cardWidth - horizontalMargin * 2, 0)
		const availableHeight = Math.max(window.innerHeight - cardHeight - verticalMargin * 2, 0)

		const scaleRatio = this.isMobile ? 0.82 : 0.98
		const scale = Math.min(availableWidth, availableHeight) * scaleRatio

		const centerOffsetX = horizontalMargin + (availableWidth - scale) / 2
		const centerOffsetY = verticalMargin + (availableHeight - scale) / 2

		const minNormalizedY = 0
		const maxNormalizedY = 1
		const baseMinTop = centerOffsetY + (minNormalizedY + verticalOffsetRatio) * scale
		const baseMaxBottom = centerOffsetY + (maxNormalizedY + verticalOffsetRatio) * scale + cardHeight
		const rawVerticalDelta = (window.innerHeight - baseMaxBottom - baseMinTop) / 2
		const verticalDelta = Number.isFinite(rawVerticalDelta) ? rawVerticalDelta : 0

		this._layoutCache = {
			cardWidth,
			cardHeight,
			horizontalMargin,
			verticalMargin,
			scale,
			centerOffsetX,
			centerOffsetY,
			verticalOffsetRatio,
			verticalDelta
		}
		return this._layoutCache
	}

	/**
	 * 处理窗口大小变化
	 */
	handleResize() {
		this.updateMobileState()
		this._layoutCache = null

		// 更新全屏卡片尺寸
		const maximizedCard = stateManager.getMaximizedCard()
		if (maximizedCard) {
			maximizedCard.style.width = `${window.innerWidth}px`
			maximizedCard.style.height = `${window.innerHeight}px`
		}

		// 重新布局爱心形状的卡片
		this.relayoutCards()
	}
}

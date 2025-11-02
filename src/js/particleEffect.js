/**
 * 粒子光环效果管理模块
 * 在所有卡片加载完成后，在爱心外围显示梦幻的粒子光环
 */

import { isMobileDevice } from './utils.js'

/**
 * 缓动函数 - ease-in-out (慢-快-慢)
 */
function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * 缓动函数 - ease-in (加速)
 */
function easeInQuad(t) {
	return t * t
}

/**
 * 粒子光环效果管理器
 */
export class ParticleEffect {
	constructor(boardElement) {
		this.board = boardElement
		this.isMobile = isMobileDevice()
		this.canvas = null
		this.ctx = null
		this.particles = []
		this.animationId = null
	}

	/**
	 * 创建并显示粒子光环效果
	 */
	showHeartParticles() {
		// 创建canvas
		this.createCanvas()

		// 生成粒子
		this.generateParticles()

		// 开始动画
		this.animate()
	}

	/**
	 * 创建canvas元素
	 */
	createCanvas() {
		this.canvas = document.createElement('canvas')
		this.canvas.className = 'particle-canvas'
		// 使用当前窗口的实时尺寸
		const currentWidth = window.innerWidth
		const currentHeight = window.innerHeight
		this.canvas.width = currentWidth
		this.canvas.height = currentHeight
		this.canvas.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			pointer-events: none;
			z-index: 1000;
		`
		this.board.appendChild(this.canvas)
		this.ctx = this.canvas.getContext('2d')
	}

	/**
	 * 生成粒子 - 基于实际卡片位置
	 */
	generateParticles() {
		// 获取所有卡片元素
		const cards = document.querySelectorAll('.card')
		if (cards.length === 0) return

		// 收集所有卡片的中心位置
		const cardCenters = []
		cards.forEach(card => {
			const rect = card.getBoundingClientRect()
			cardCenters.push({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			})
		})

		// 计算爱心的实际边界框
		let minX = Infinity, maxX = -Infinity
		let minY = Infinity, maxY = -Infinity
		cardCenters.forEach(center => {
			minX = Math.min(minX, center.x)
			maxX = Math.max(maxX, center.x)
			minY = Math.min(minY, center.y)
			maxY = Math.max(maxY, center.y)
		})

		// 计算实际的爱心中心
		const heartCenterX = (minX + maxX) / 2
		const heartCenterY = (minY + maxY) / 2

		// 波浪起始点：爱心顶部
		const waveOriginX = heartCenterX
		const waveOriginY = minY

		// 粒子数量：移动端较少，桌面端较多
		const particleCount = this.isMobile ? 80 : 150

		// 在卡片位置上均匀采样生成粒子
		const step = Math.max(1, Math.floor(cardCenters.length / particleCount))

		for (let i = 0; i < cardCenters.length; i += step) {
			const cardCenter = cardCenters[i]

			// 从爱心中心到卡片的方向向量
			const dx = cardCenter.x - heartCenterX
			const dy = cardCenter.y - heartCenterY
			const distance = Math.sqrt(dx * dx + dy * dy)

			// 归一化方向向量并外扩（增加10%让视觉效果更明显）
			const expandDistance = this.isMobile ? 40 : 70
			const normalizedDx = (dx / distance) * expandDistance
			const normalizedDy = (dy / distance) * expandDistance

			// 粒子的最终位置（在卡片外围）
			const x = cardCenter.x + normalizedDx
			const y = cardCenter.y + normalizedDy

			// 计算粒子到波浪起始点的距离（用于延迟出现）
			const distanceFromWaveOrigin = Math.sqrt(
				Math.pow(x - waveOriginX, 2) + Math.pow(y - waveOriginY, 2)
			)

			// 波浪延迟：距离越远，延迟越大
			// 让波浪从顶部向下、向两侧扩散
			const waveDelay = distanceFromWaveOrigin * 0.15 // 调整这个系数可以控制波浪速度

			// 创建粒子
			this.particles.push({
				x,
				y,
				baseX: x,
				baseY: y,
				size: this.isMobile ? (Math.random() * 2 + 1) : (Math.random() * 3 + 2),
				opacity: 0,
				targetOpacity: Math.random() * 0.6 + 0.4,
				fadeInSpeed: Math.random() * 0.02 + 0.01,
				fadeOutSpeed: Math.random() * 0.015 + 0.005,
				phase: Math.random() * Math.PI * 2, // 用于呼吸效果
				pulseSpeed: Math.random() * 0.02 + 0.01,
				color: this.getParticleColor(),
				glowSize: this.isMobile ? (Math.random() * 10 + 5) : (Math.random() * 15 + 10),
				lifetime: 0,
				maxLifetime: Math.random() * 100 + 150, // 150-250帧的生命周期
				waveDelay: waveDelay, // 波浪延迟
				hasStarted: false // 标记粒子是否已开始出现
			})
		}
	}

	/**
	 * 获取粒子颜色（根据主题）
	 */
	getParticleColor() {
		const isDarkTheme = !document.body.classList.contains('light-theme')

		const darkColors = [
			'rgba(255, 182, 193, 0.9)', // 浅粉
			'rgba(255, 218, 185, 0.9)', // 桃色
			'rgba(221, 160, 221, 0.9)', // 淡紫
			'rgba(173, 216, 230, 0.9)', // 淡蓝
			'rgba(255, 239, 213, 0.9)', // 杏色
		]

		const lightColors = [
			'rgba(255, 105, 180, 0.9)', // 深粉
			'rgba(255, 140, 105, 0.9)', // 珊瑚
			'rgba(186, 85, 211, 0.9)',  // 紫色
			'rgba(100, 149, 237, 0.9)', // 矢车菊蓝
			'rgba(255, 165, 0, 0.9)',   // 橙色
		]

		const colors = isDarkTheme ? darkColors : lightColors
		return colors[Math.floor(Math.random() * colors.length)]
	}

	/**
	 * 动画循环
	 */
	animate() {
		// 清除画布
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		let allParticlesFaded = true

		// 绘制每个粒子
		this.particles.forEach(particle => {
			// 检查粒子是否到了开始出现的时间
			if (!particle.hasStarted) {
				if (particle.lifetime >= particle.waveDelay) {
					particle.hasStarted = true
					particle.lifetime = 0 // 重置生命周期，从淡入开始
				} else {
					particle.lifetime++
					allParticlesFaded = false
					return // 还没到出现时间，跳过这个粒子
				}
			}

			particle.lifetime++

			// 淡入阶段（使用缓动函数）
			if (particle.lifetime < 60) {
				const progress = particle.lifetime / 60 // 0 到 1
				const easedProgress = easeInOutCubic(progress)
				particle.opacity = easedProgress * particle.targetOpacity
				allParticlesFaded = false
			}
			// 停留阶段
			else if (particle.lifetime < particle.maxLifetime) {
				// 呼吸效果
				particle.phase += particle.pulseSpeed
				const pulse = Math.sin(particle.phase) * 0.15 + 1
				particle.currentSize = particle.size * pulse
				allParticlesFaded = false
			}
			// 淡出阶段（使用缓动函数）
			else {
				const fadeOutDuration = 80 // 淡出持续帧数
				const fadeOutProgress = (particle.lifetime - particle.maxLifetime) / fadeOutDuration
				if (fadeOutProgress < 1) {
					const easedProgress = easeInQuad(fadeOutProgress)
					particle.opacity = particle.targetOpacity * (1 - easedProgress)
					allParticlesFaded = false
				} else {
					particle.opacity = 0
				}
			}

			// 绘制粒子（带光晕）
			if (particle.opacity > 0) {
				const currentSize = particle.currentSize || particle.size

				// 绘制外层光晕
				const gradient = this.ctx.createRadialGradient(
					particle.x, particle.y, 0,
					particle.x, particle.y, particle.glowSize
				)
				gradient.addColorStop(0, particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`))
				gradient.addColorStop(1, particle.color.replace(/[\d.]+\)$/, '0)'))

				this.ctx.fillStyle = gradient
				this.ctx.beginPath()
				this.ctx.arc(particle.x, particle.y, particle.glowSize, 0, Math.PI * 2)
				this.ctx.fill()

				// 绘制核心粒子
				this.ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`);
				this.ctx.beginPath()
				this.ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2)
				this.ctx.fill()
			}
		})

		// 如果所有粒子都消失了，停止动画并清理
		if (allParticlesFaded) {
			this.stop()
		} else {
			this.animationId = requestAnimationFrame(() => this.animate())
		}
	}

	/**
	 * 停止动画并清理
	 */
	stop() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId)
			this.animationId = null
		}
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas)
		}
		this.particles = []
		this.canvas = null
		this.ctx = null
	}
}

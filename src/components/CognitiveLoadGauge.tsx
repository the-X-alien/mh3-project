import { motion } from 'framer-motion'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

function getColor(cli: number): string {
  if (cli > 75) return '#e6a817'
  if (cli > 40) return '#e6a817'
  return '#2ecc71'
}

function getBackground(cli: number): string {
  if (cli > 75) return 'rgba(230,168,23,0.12)'
  if (cli > 40) return 'rgba(230,168,23,0.12)'
  return 'rgba(46,204,113,0.12)'
}

export default function CognitiveLoadGauge({ cli }: { cli: number }) {
  const data = {
    datasets: [
      {
        data: [cli, 100 - cli],
        backgroundColor: [getColor(cli), getBackground(cli)],
        borderWidth: 0,
      },
    ],
  }

  const options = {
    cutout: '78%' as const,
    responsive: true,
    maintainAspectRatio: true,
    animation: { animateRotate: true, duration: 400 } as any,
    plugins: { tooltip: { enabled: false } },
  }

  return (
    <div className="relative w-[170px] h-[170px] mx-auto my-4">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          key={cli}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-5xl tracking-tight leading-none"
          style={{ color: getColor(cli) }}
        >
          {Math.round(cli)}
        </motion.span>
        <span className="font-mono text-caption uppercase tracking-widest text-fog mt-1">
          CLI
        </span>
      </div>
    </div>
  )
}

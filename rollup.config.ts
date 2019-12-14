import path from 'path'
import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import typescript2 from 'rollup-plugin-typescript2'
import typescript from 'typescript'

import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'

import pkg from './package.json'

const minOutputs = [
  {
    file: pkg.main,
    format: 'cjs'
  },
  {
    file: pkg.module,
    format: 'es'
  },
  {
    name: 'TsPromise',
    file: './dist/index.min.js',
    format: 'umd'
  }
]

const outputs = minOutputs.map(minOutput => ({
  ...minOutput,
  file: minOutput.file.replace('.min', '')
}))

const buildCommon = format => ({
  input: path.resolve(__dirname, './src/typescript/index.ts'),
  plugins: [
    resolve(),
    commonjs({
      include: /.\/node_modules/
    }),
    json(),
    typescript2({
      typescript,
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        compilerOptions: {
          target: format === 'es' ? 'es6' : 'es5'
        }
      },
      clean: true
    })
  ]
})

const buildMinCommon = format => {
  const common = buildCommon(format)
  return {
    ...common,
    plugins: common.plugins.slice(0, common.plugins.length - 1).concat(
      typescript2({
        typescript,
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            target: format === 'es' ? 'es6' : 'es5'
          },
          removeComments: true
        },
        clean: true
      }),
      terser()
    )
  }
}

export default minOutputs
  .map(minOutput => ({
    output: minOutput,
    ...buildMinCommon(minOutput.format)
  }))
  .concat(
    outputs.map(output => ({
      output,
      ...buildCommon(output.format)
    }))
  )

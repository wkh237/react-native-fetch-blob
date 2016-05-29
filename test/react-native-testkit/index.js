import TestContext from './lib/test-context'
import Comparer from './lib/comparer'
import Reporter from './components/reporter'
import Assert from './components/assert'
import Info from './components/info'

const { describe, run, prop } = TestContext

export default {
  TestContext,
  Reporter,
  Info,
  Assert,
  Comparer,
  describe,
  run,
  prop
}

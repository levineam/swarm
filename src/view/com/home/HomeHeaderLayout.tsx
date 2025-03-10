import {ReactNode} from 'react'
import {View} from 'react-native'

import {HomeHeaderLayoutMobile} from './HomeHeaderLayoutMobile'

interface HomeHeaderLayoutProps {
  children: ReactNode
  tabBarAnchor: JSX.Element | null | undefined
}

export function HomeHeaderLayout(props: HomeHeaderLayoutProps) {
  // Get the original component's implementation
  const OriginalHeaderLayout = HomeHeaderLayoutMobile

  return (
    <View>
      {/* Render the original header layout */}
      <OriginalHeaderLayout {...props} />
    </View>
  )
}

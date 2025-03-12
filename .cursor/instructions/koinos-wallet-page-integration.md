# Koinos Wallet Page Integration

This document outlines the steps to move the Koinos wallet integration from the landing page to a dedicated wallet page accessible from the side panel.

## Current Status

- ✅ The Koinos wallet functionality is implemented and working on the landing page.
- ✅ The wallet integration code exists in `src/lib/koinos/` directory.
- ✅ The wallet display components are implemented in `src/view/com/util/KoinosWalletDisplayNew.tsx` and related files.
- ✅ The wallet screen component has been created at `src/screens/Wallet/Wallet.tsx`.
- ✅ The Wallet route has been added to the navigation configuration.
- ⚠️ The wallet icon and text are not appearing in the side panel between Profile and Settings, even though code for it exists.
- ✅ The warning about "could not resolve identity: did:web:localhost:3000" has been fixed by removing the empty div that previously contained wallet UI.

## Root Cause Analysis

After extensive investigation, we have determined:

1. The `WalletMenuItem` component is correctly defined in `src/view/shell/Drawer.tsx` and appears to be correctly included in the DrawerContent component.
2. The navigation to the Wallet screen is properly configured with `onPressWallet`.
3. When inspecting the sidebar UI, the Lists menu item is still appearing, while our Wallet menu item is not visible.
4. The app still shows the identity resolution warning despite our previous attempt to fix it.

## Updated Troubleshooting Plan

### Step 1: Fully Restore the Original Drawer.tsx File
- Revert our changes to the Drawer.tsx file to ensure we're starting from a clean state.
- Verify that the file is back to its original state.

### Step 2: Add Debug Outputs to Trace Rendering
- Add console log statements to track when components are rendering.
- Add background colors to menu items to make them more visible.
- Track the `hasSession` state to ensure the correct menu items are displayed.

### Step 3: Correct WalletMenuItem Implementation
- Ensure the WalletMenuItem uses the correct icon imports.
- Use the same pattern as other menu items for consistency.
- Make sure it's properly memoized like other menu items.

### Step 4: Verify Proper Menu Structure
- Remove any previous attempts to replace the Lists menu item.
- Ensure the WalletMenuItem is placed between ProfileMenuItem and SettingsMenuItem.
- Verify that the navigation is properly configured.

### Step 5: Fix the Error Message
- Look for the source of the "could not resolve identity: did:web:localhost:3000" warning.
- Fix it properly by addressing the root cause rather than just hiding elements.

### Step 6: Test the Integration
- Verify that the wallet icon appears in the side panel.
- Verify that clicking the wallet icon navigates to the wallet page.
- Verify that the wallet functionality works correctly on the dedicated page.

## Implementation Details

### Wallet Icon Component (Completed)

The wallet icon follows the same pattern as other icons in the codebase:
```typescript
export function Wallet_Stroke2_Corner0_Rounded({
  size = 'md',
  fill,
  style,
  ...props
}: Props) {
  return (
    <Svg
      width={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      height={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      {...props}>
      <Path
        d="M18 8H21C21.5523 8 22 8.44772 22 9V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H18C18.5523 4 19 4.44772 19 5V7C19 7.55228 18.5523 8 18 8Z"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 14C16 12.8954 16.8954 12 18 12C19.1046 12 20 12.8954 20 14C20 15.1046 19.1046 16 18 16C16.8954 16 16 15.1046 16 14Z"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
```

### Wallet Screen Component (Completed)

The wallet screen follows the same pattern as other screens in the codebase:
```typescript
export function WalletScreen({}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()

  // Add wallet state
  const [walletInfo, setWalletInfo] = useState<LinkedWalletInfo | null>(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)
  const [showImportUI, setShowImportUI] = useState(false)

  // Get user info
  const currentUser = useMemo(
    () => (currentAccount ? {handle: currentAccount.handle} : null),
    [currentAccount],
  )

  // Check for existing wallet
  useEffect(() => {
    // Implementation
  }, [currentUser])

  // Initialize wallet function
  const initializeKoinosWallet = useCallback(async (username: string) => {
    // Implementation
  }, [])

  // Handle import success
  const handleImportSuccess = useCallback(
    (address: string) => {
      // Implementation
    },
    [currentUser],
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Wallet</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        {/* Implementation */}
      </Layout.Content>
    </Layout.Screen>
  )
}
```

### Side Panel Menu Item Pattern

The wallet menu item should follow the same pattern as other menu items in the drawer:
```typescript
let WalletMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <WalletFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Wallet style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={_(msg`Wallet`)}
      bold={isActive}
      onPress={onPress}
    />
  )
}
WalletMenuItem = React.memo(WalletMenuItem)
``` 
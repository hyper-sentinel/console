"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ── Generic tool hook ────────────────────────────────────────

export function useToolQuery<T = unknown>(
  toolName: string,
  params: Record<string, unknown> = {},
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<T>({
    queryKey: ["tool", toolName, params],
    queryFn: () => api.call<T>(toolName, params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    retry: 1,
    staleTime: 10000,
  });
}

// ═══════════════════════════════════════════════════════════
//  CRYPTO — CoinGecko (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useCryptoPrice(coinId: string) {
  return useToolQuery("get_crypto_price", { coin_id: coinId }, { refetchInterval: 30000 });
}

export function useCryptoBatch(coinIds: string[]) {
  return useToolQuery("get_crypto_batch_prices", { coin_ids: coinIds }, { refetchInterval: 30000 });
}

export function useCryptoTopN(n = 20) {
  return useToolQuery("get_crypto_top_n", { n }, { refetchInterval: 30000 });
}

export function useCryptoSearch(query: string) {
  return useToolQuery("search_crypto", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useStockPrice(ticker: string) {
  return useToolQuery("get_stock_price", { ticker }, { enabled: !!ticker, refetchInterval: 60000 });
}

// ═══════════════════════════════════════════════════════════
//  FRED — Macro Economics (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useMacroData() {
  return useToolQuery("get_economic_dashboard", {}, { refetchInterval: 300000 });
}

export function useFredSeries(seriesId: string) {
  return useToolQuery("get_fred_series", { series_id: seriesId }, { enabled: !!seriesId, refetchInterval: 300000 });
}

export function useSearchFred(query: string) {
  return useToolQuery("search_fred", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  INTELLIGENCE — Y2 News & Sentiment (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useNewsSentiment() {
  return useToolQuery("get_news_sentiment", {}, { refetchInterval: 120000 });
}

export function useNewsRecap() {
  return useToolQuery("get_news_recap", {}, { refetchInterval: 120000 });
}

export function useIntelReports() {
  return useToolQuery("get_intelligence_reports", {}, { refetchInterval: 300000 });
}

export function useReportDetail(reportId: string) {
  return useToolQuery("get_report_detail", { report_id: reportId }, { enabled: !!reportId, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  ELFA — Social Sentiment (Public, Free)
// ═══════════════════════════════════════════════════════════

export function useTrendingTokens() {
  return useToolQuery("get_trending_tokens", {}, { refetchInterval: 60000 });
}

export function useTopMentions() {
  return useToolQuery("get_top_mentions", {}, { refetchInterval: 60000 });
}

export function useSearchMentions(query: string) {
  return useToolQuery("search_mentions", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useTrendingNarratives() {
  return useToolQuery("get_trending_narratives", {}, { refetchInterval: 120000 });
}

export function useTokenNews(token: string) {
  return useToolQuery("get_token_news", { token }, { enabled: !!token, refetchInterval: 60000 });
}

// ═══════════════════════════════════════════════════════════
//  SOCIAL — X/Twitter
// ═══════════════════════════════════════════════════════════

export function useXSearch(query: string) {
  return useToolQuery("search_x", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  HYPERLIQUID — Perp Trading (Pro)
// ═══════════════════════════════════════════════════════════

export function useHLConfig() {
  return useToolQuery("get_hl_config", {}, { refetchInterval: 300000 });
}

export function useHLAccount() {
  return useToolQuery("get_hl_account_info", {}, { refetchInterval: 15000 });
}

export function useHLPositions() {
  return useToolQuery("get_hl_positions", {}, { refetchInterval: 10000 });
}

export function useHLOrderbook(coin: string) {
  return useToolQuery("get_hl_orderbook", { coin }, { enabled: !!coin, refetchInterval: 5000 });
}

export function useOpenOrders() {
  return useToolQuery("get_hl_open_orders", {}, { refetchInterval: 5000 });
}

export function usePlaceHLOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { coin: string; side: string; size: number; price?: number; orderType?: string }) =>
      api.placeHLOrder(params.coin, params.side, params.size, params.price, params.orderType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_positions"] });
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_open_orders"] });
    },
  });
}

export function useCancelHLOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { coin: string; orderId: string }) =>
      api.cancelHLOrder(params.coin, params.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_open_orders"] });
    },
  });
}

export function useCloseHLPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (coin: string) => api.closeHLPosition(coin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_hl_positions"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════
//  ASTER DEX — Futures Trading (Pro)
// ═══════════════════════════════════════════════════════════

export function useAsterDiagnose() {
  return useToolQuery("aster_diagnose", {}, { refetchInterval: 0 });
}

export function useAsterPing() {
  return useToolQuery("aster_ping", {}, { refetchInterval: 60000 });
}

export function useAsterTicker(symbol: string) {
  return useToolQuery("aster_ticker", { symbol }, { enabled: !!symbol, refetchInterval: 10000 });
}

export function useAsterOrderbook(symbol: string) {
  return useToolQuery("aster_orderbook", { symbol }, { enabled: !!symbol, refetchInterval: 5000 });
}

export function useAsterKlines(symbol: string, interval = "5m", limit = 200) {
  return useToolQuery("aster_klines", { symbol, interval, limit }, { enabled: !!symbol, refetchInterval: 30000 });
}

export function useAsterFundingRate(symbol: string) {
  return useToolQuery("aster_funding_rate", { symbol }, { enabled: !!symbol, refetchInterval: 30000 });
}

export function useAsterExchangeInfo() {
  return useToolQuery("aster_exchange_info", {}, { refetchInterval: 300000 });
}

export function useAsterBalance() {
  return useToolQuery("aster_balance", {}, { refetchInterval: 15000 });
}

export function useAsterPositions() {
  return useToolQuery("aster_positions", {}, { refetchInterval: 10000 });
}

export function useAsterAccountInfo() {
  return useToolQuery("aster_account_info", {}, { refetchInterval: 30000 });
}

export function useAsterOpenOrders() {
  return useToolQuery("aster_open_orders", {}, { refetchInterval: 5000 });
}

export function usePlaceAsterOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { symbol: string; side: string; quantity: number; price?: number; orderType?: string }) =>
      api.asterPlaceOrder(params.symbol, params.side, params.quantity, params.price, params.orderType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_positions"] });
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useCancelAsterOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { symbol: string; orderId: string }) =>
      api.asterCancelOrder(params.symbol, params.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useCancelAllAster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol?: string) => api.asterCancelAll(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "aster_open_orders"] });
    },
  });
}

export function useAsterSetLeverage() {
  return useMutation({
    mutationFn: (params: { symbol: string; leverage: number }) =>
      api.asterSetLeverage(params.symbol, params.leverage),
  });
}

// ═══════════════════════════════════════════════════════════
//  POLYMARKET — Prediction Markets (Pro)
// ═══════════════════════════════════════════════════════════

export function usePolymarketMarkets() {
  return useToolQuery("get_polymarket_markets", {}, { refetchInterval: 30000 });
}

export function usePolymarketSearch(query: string) {
  return useToolQuery("search_polymarket", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function usePolymarketOrderbook(marketId: string) {
  return useToolQuery("get_polymarket_orderbook", { market_id: marketId }, { enabled: !!marketId, refetchInterval: 5000 });
}

export function usePolymarketPrice(marketId: string) {
  return useToolQuery("get_polymarket_price", { market_id: marketId }, { enabled: !!marketId, refetchInterval: 15000 });
}

export function usePolymarketPositions() {
  return useToolQuery("get_polymarket_positions", {}, { refetchInterval: 30000 });
}

export function useBuyPolymarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { marketId: string; outcome: string; amount: number }) =>
      api.buyPolymarket(params.marketId, params.outcome, params.amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_polymarket_positions"] });
    },
  });
}

export function useSellPolymarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { marketId: string; outcome: string; amount: number }) =>
      api.sellPolymarket(params.marketId, params.outcome, params.amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_polymarket_positions"] });
    },
  });
}

export function usePlacePolymarketLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { marketId: string; outcome: string; price: number; amount: number }) =>
      api.placePolymarketLimit(params.marketId, params.outcome, params.price, params.amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_polymarket_positions"] });
    },
  });
}

export function useCancelPolymarketOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.cancelPolymarketOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_polymarket_positions"] });
    },
  });
}

export function useCancelAllPolymarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelAllPolymarket(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool", "get_polymarket_positions"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════
//  TELEGRAM — Channel Monitoring (Pro)
// ═══════════════════════════════════════════════════════════

export function useTGChannels() {
  return useToolQuery("tg_list_channels", {}, { refetchInterval: 0 });
}

export function useTGFeed(channel: string, limit = 20) {
  return useToolQuery("tg_read_channel", { channel, limit }, { enabled: !!channel, refetchInterval: 10000 });
}

export function useTGSearch(query: string) {
  return useToolQuery("tg_search_messages", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useTGSend() {
  return useMutation({
    mutationFn: (params: { channel: string; message: string }) =>
      api.tgSendMessage(params.channel, params.message),
  });
}

// ═══════════════════════════════════════════════════════════
//  DISCORD — Server Monitoring (Pro)
// ═══════════════════════════════════════════════════════════

export function useDiscordGuilds() {
  return useToolQuery("discord_list_guilds", {}, { refetchInterval: 0 });
}

export function useDiscordChannels(guildId: string) {
  return useToolQuery("discord_list_channels", { guild_id: guildId }, { enabled: !!guildId, refetchInterval: 0 });
}

export function useDiscordFeed(channelId: string, limit = 20) {
  return useToolQuery("discord_read_channel", { channel_id: channelId, limit }, { enabled: !!channelId, refetchInterval: 10000 });
}

export function useDiscordSearch(query: string) {
  return useToolQuery("discord_search_messages", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

export function useDiscordSend() {
  return useMutation({
    mutationFn: (params: { channelId: string; content: string }) =>
      api.discordSendMessage(params.channelId, params.content),
  });
}

// ═══════════════════════════════════════════════════════════
//  BILLING & ACCOUNT — Stripe + USDC
// ═══════════════════════════════════════════════════════════

export function useBillingStatus() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<Record<string, any>>({
    queryKey: ["billing", "status"],
    queryFn: () => api.getBillingStatus() as any,
    staleTime: 60000,
  });
}

export function useBillingUsage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<Record<string, any>>({
    queryKey: ["billing", "usage"],
    queryFn: () => api.getBillingUsage() as any,
    staleTime: 60000,
  });
}

export function useBillingHistory() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<any[]>({
    queryKey: ["billing", "history"],
    queryFn: () => api.getBillingHistory() as any,
    staleTime: 60000,
  });
}

export function useUSDCBalance() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<Record<string, any>>({
    queryKey: ["billing", "usdc"],
    queryFn: () => api.getUSDCBalance() as any,
    staleTime: 30000,
  });
}

export function useRegisterUSDCWallet() {
  return useMutation({
    mutationFn: (walletAddress: string) => api.registerUSDCWallet(walletAddress),
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: "pro" | "enterprise") => api.subscribe(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useCreateApiKey() {
  return useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
  });
}

// ═══════════════════════════════════════════════════════════
//  SYSTEM — Health, Tools, Metrics
// ═══════════════════════════════════════════════════════════

export function useApiHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useToolsList() {
  return useQuery({
    queryKey: ["tools", "list"],
    queryFn: () => api.listTools(),
    staleTime: 300000,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => api.getMetrics(),
    staleTime: 60000,
  });
}

// ═══════════════════════════════════════════════════════════
//  DEX — DexScreener helpers (mapped to search_crypto)
// ═══════════════════════════════════════════════════════════

export function useDexTrending() {
  return useToolQuery("get_trending_tokens", {}, { refetchInterval: 60000 });
}

export function useDexSearch(query: string) {
  return useToolQuery("search_crypto", { query }, { enabled: query.length > 1, refetchInterval: 0 });
}

// ═══════════════════════════════════════════════════════════
//  TRADE HISTORY
// ═══════════════════════════════════════════════════════════

export function useTradeHistory() {
  return useToolQuery("get_hl_trade_history", {}, { refetchInterval: 15000 });
}

export function useAsterTradeHistory() {
  return useToolQuery("aster_trade_history", {}, { refetchInterval: 15000 });
}

// ═══════════════════════════════════════════════════════════
//  STRATEGY — Algo Trading (v0.6.0)
// ═══════════════════════════════════════════════════════════

export function useStrategyStatus(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ["strategy", "status"],
    queryFn: () => api.strategyStatus(),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 5000,
    retry: 1,
  });
}

export function useAlgoList() {
  return useQuery({
    queryKey: ["strategy", "algos"],
    queryFn: () => api.listAlgos(),
    staleTime: 300000,
    retry: 1,
  });
}

export function useAlgoInfo(name: string) {
  return useQuery({
    queryKey: ["strategy", "algo", name],
    queryFn: () => api.algoInfo(name),
    enabled: !!name,
    staleTime: 300000,
  });
}


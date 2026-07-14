export interface Debater {
  id: number
  side: 'A' | 'B'
  name: string
  position?: string
  displayOrder?: number
}

export interface ActiveRound {
  id: number
  topic: string
  sideAName: string
  sideBName: string
  startedAt: string | null
  voteDurationSeconds: number
  locked: boolean
  isActive: boolean
  secondsLeft: number | null
  debatersA: Debater[]
  debatersB: Debater[]
}

export interface MeStatus {
  openid: string | null
  votedActive: boolean
  activeRoundId: number | null
}

export interface VoteRequest {
  roundId: number
  supportSide: 'A' | 'B'
  bestAId: number
  bestBId: number
}

export interface DebaterVoteCount {
  id: number
  side: 'A' | 'B'
  name: string
  position?: string
  votes: number
}

export interface RoundResult {
  roundId: number
  topic: string
  sideAName: string
  sideBName: string
  totalVotes: number
  supportA: number
  supportB: number
  debaterVotes: DebaterVoteCount[]
  locked: boolean
  secondsLeft: number | null
}

export interface DebateRound {
  id: number
  topic: string
  sideAName: string
  sideBName: string
  isActive: number
  startedAt: string | null
  voteDurationSeconds: number
  locked: number
  publicDisplay: number
  accessPassword?: string
  displayOrder: number
  debaters: Debater[]
}

export interface DebaterInput {
  name: string
  side: 'A' | 'B'
  position?: string
  displayOrder?: number
}

export interface CreateRoundRequest {
  topic: string
  sideAName: string
  sideBName: string
  voteDurationSeconds?: number
  displayOrder?: number
  publicDisplay?: boolean
  debaters: DebaterInput[]
}

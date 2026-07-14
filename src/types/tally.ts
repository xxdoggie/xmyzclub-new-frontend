export type ActivityStatus = 0 | 1 | 2  // 0待开始 1进行中 2已结束

export interface TallyCandidate {
  id: number
  number: string
  name: string
  displayOrder: number
  voteCount: number
}

export interface TallyActivity {
  id: number
  title: string
  status: ActivityStatus
  createdBy: number
  createdAt: string
  updatedAt: string
  candidates?: TallyCandidate[]
}

export interface ActivitySnapshot {
  activityId: number
  title: string
  status: ActivityStatus
  candidates: TallyCandidate[]
  updatedAt: string
}

export interface TallyRecord {
  id: number
  candidateId: number
  candidateNumber: string
  candidateName: string
  userId: number
  delta: number
  type: 0 | 1
  originalRecordId: number | null
  createdAt: string
}

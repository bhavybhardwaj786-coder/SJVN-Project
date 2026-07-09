import { supabase } from '@/lib/supabase'

export const documentsService = {
  uploadDocument: async (file: File, submissionId: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${submissionId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (error) return { data: null, error }

    const { data: publicUrl } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Save record in documents table
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        submission_id: submissionId,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      })

    return { data: publicUrl, error: dbError }
  },

  getSubmissionDocuments: async (submissionId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('submission_id', submissionId)
    return { data, error }
  }
}
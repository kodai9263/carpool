"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { UpdateRideValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import RideBasicForm from "../_components/RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import RideDriverList from "../_components/RideDriverList";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { convertRideDetailToFormValues } from "@/utils/rideConverter";
import { Copy, Share2 } from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";

export default function Page() {
  const methods = useForm<UpdateRideValues>({
    defaultValues: {
      destination: "",
      drivers: [],
    },
  });
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
    watch,
    control,
  } = methods;

  const { validateDate, handleDateChange } = createRideDateValidation(methods);

  const date = watch("date");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "drivers",
  });

  const params = useParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const { token } = useSupabaseSession();
  const router = useRouter();

  const { data, error, isLoading } = useFetch<RideDetailResponse>(`/api/admin/teams/${teamId}/rides/${rideId}`);
  const isDeleting = useRef(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (data?.ride) {
      const formValues = convertRideDetailToFormValues(data.ride);
      // 各ドライバーの空の行を削除
      formValues.drivers = formValues.drivers.map((driver) => ({
        ...driver,
        rideAssignments: driver.rideAssignments.filter(
          (child) => child.childId !== 0
        ),
      }));
      reset(formValues);
    }
  }, [data, reset]);

  const onSubmit = async (data: UpdateRideValues) => {
    if (!validateDate()) return;
    if (!token) return;

    // 配車情報更新
    try {
      await api.put<UpdateRideValues>(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        data,
        token
      );
      alert("配車詳細を更新しました。");
    } catch (e: unknown) {
      console.error(e);
      alert("更新中にエラーが発生しました。");
    }
  };

  // 配車削除
  const handleDeleteRide = async () => {
    if (!confirm("配車を削除しますか？")) return;
    if (!token) return;

    try {
      isDeleting.current = true;
      await api.delete(`/api/admin/teams/${teamId}/rides/${rideId}`, token);

      alert("配車を削除しました。");

      router.replace(`/admin/teams/${teamId}/rides`);
    } catch (e: unknown) {
      isDeleting.current = false;
      console.error(e);
      alert("削除中にエラーが発生しました。");
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      alert("コピーに失敗しました");
    }
  };

  // 共有用テキストをコピー
  const copyShareText = () => {
    if (!data?.ride) return;
    
    const memberUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`;
    
    const text = `【${formatDate(data.ride.date)}の配車について】

以下のURLからPINコードを入力して、配車可否を入力してください！

🔗 URL:
${memberUrl}

よろしくお願いします！`;

    copyToClipboard(text, "共有テキスト");
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    if (isDeleting.current) {
      return <LoadingSpinner />;
    }
    if (error.message?.includes("404") || error.status === 404) {
      notFound();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-4 md:py-10 px-4">
      <div className="w-full max-w-[1000px] bg-white rounded-xl shadow-lg p-4 md:p-8">
        <h1 className="text-3xl font-bold text-center mb-8">🚗 配車詳細</h1>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <RideBasicForm
                  date={date}
                  onDateChange={handleDateChange}
                  error={!!errors.date}
                />
              </div>
            </div>

            <RideDriverList
              drivers={fields}
              availabilityDrivers={data?.ride?.availabilityDrivers ?? []}
              childrenList={data?.ride?.children ?? []}
              appendDriver={() =>
                append({
                  availabilityDriverId: 0,
                  seats: 0,
                  rideAssignments: [],
                })
              }
              removeDriver={remove}
            />

            {/* メンバー共有セクション */}
            <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Share2 size={20} className="text-blue-600" />
                メンバー共有用
              </h3>
              
              {/* URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  アクセスURL
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={typeof window !== 'undefined' ? `${window.location.origin}/member/teams/${teamId}/rides/${rideId}` : ''}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(`${window.location.origin}/member/teams/${teamId}/rides/${rideId}`, "URL")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Copy size={16} />
                    {copied === "URL" ? "✓" : "コピー"}
                  </button>
                </div>
              </div>

              {/* 共有用テキスト一括コピー */}
              <button
                type="button"
                onClick={copyShareText}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={20} />
                {copied === "共有テキスト" ? "コピーしました！" : "LINEで共有するテキストをコピー"}
              </button>
            </div>

            <UpdateDeleteButtons
              onUpdate={handleSubmit(onSubmit)}
              onDelete={handleDeleteRide}
              isSubmitting={isSubmitting}
            />
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

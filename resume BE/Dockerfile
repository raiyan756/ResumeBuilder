FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ResumeBuilder.Api/ResumeBuilder.Api.csproj ResumeBuilder.Api/
RUN dotnet restore ResumeBuilder.Api/ResumeBuilder.Api.csproj
COPY ResumeBuilder.Api/ ResumeBuilder.Api/
RUN dotnet publish ResumeBuilder.Api/ResumeBuilder.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "ResumeBuilder.Api.dll"]
